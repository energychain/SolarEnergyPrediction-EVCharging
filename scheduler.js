module.exports = function(CONFIG) {

  /* Scheduler runnter interval in Milliseconds (1000 = 1 second)*/
  const RUNNER_INTERVAL = 1000;
  const CP_POWERMAX = CONFIG.CP_POWERMAX; // Maximum power in Watt per wallbox configuration. Used to set Max Power in Prio A.
  const EV_POWERMAX = CONFIG.EV_POWERMAX;
  const EV_FULL_CAPACITY = CONFIG.EV_FULL_CAPACITY; // kWh at SoC 100


  /* Listen to the following events to react in infrastructure */
  this.setCPPower = function(wattPower) {
    this.emitter.emit("setCPPower",wattPower);
  }

  this.setAllowGridOut = function(allow) {
    this.emitter.emit("setAllowGridOut",allow);
  }

  this.setAllowGridIn = function(allow) {
    this.emitter.emit("setAllowGridIn",allow);
  }

  this.setAllowPV = function(allow) {
    this.emitter.emit("setAllowPV",allow);
  }

  this.setAllowBattery = function(allow) {
      this.emitter.emit("setAllowBattery",allow);
  }

  /* State Modal of scheduler - change with instance object per new sensor/metric value */
  this.status = {
    priority:'-',
    soc:0,
    sessionStart:0,
    runner:'init',
    generation:5000
  }

  /* No need to change below */

  /* Solar Prediction API */
  const libapi = require("./solarpredictionapi.js");
  const EventEmitter = require('events');

  class Events extends EventEmitter {
      constructor() {
         super();
      }
  }

  this.emitter = new Events();

  /* Handling of different priorities - No need to change below */
  this.priorities =  [
    {
      name:'A',
      soc:-1,
      start: async (scheduler) => {
        scheduler.setCPPower(CP_POWERMAX);
        scheduler.setAllowGridOut(true);
        scheduler.setAllowGridIn(false);
        scheduler.setAllowPV(true);
        scheduler.setAllowBattery(true);
      },
      run: async (scheduler) => {},
      end: async (scheduler) => {}
    },
    {
      name:'B',
      soc:25,
      start: async (scheduler) => {
        scheduler.status.priorityBstart = new Date().getTime();
        scheduler.setAllowGridOut(true); //  might be changed in run()
        scheduler.setAllowGridIn(false); //  might be changed in run()
        scheduler.setAllowPV(true);
        scheduler.setAllowBattery(true);
      },
      run: async (scheduler) => {
        /*
          Ensure we have a forecast not older than 1 hour (3600000 milliseconds)
        */
        if(
            (typeof scheduler.status.forecast == 'undefined') ||
            (scheduler.status.forecast.updated < new Date().getTime()-3600000)
          ) {
                scheduler.status.forecast = await scheduler.predictionapi.retrieveForecast();
                scheduler.status.forecast.updated = new Date().getTime();
          }
        const requiredWh = (EV_FULL_CAPACITY * .5) - ((scheduler.status.soc/100) * EV_FULL_CAPACITY); // Caution hardcoded 50% = start of PrioC

        let relevantPredictedHours = [];
        let predictedTotalGenerationWh = 0;
        for(let i=0;i<scheduler.status.forecast.output.length;i++) {
          if(
              (scheduler.status.forecast.output[i].timestamp > new Date().getTime()) &&
              (scheduler.status.forecast.output[i].timestamp < scheduler.status.priorityBstart + (12*3600000))
            ) {
              // We might limit in case generation is higher than CP_POWERMAX or EV_POWERMAX
              let predictedWh = scheduler.status.forecast.output[i].wh;
              if(predictedWh > CP_POWERMAX) predictedWh = CP_POWERMAX;
              if(predictedWh > EV_POWERMAX) predictedWh = EV_POWERMAX;
              predictedTotalGenerationWh += predictedWh;
              scheduler.status.forecast.output[i].usable = predictedWh;
              relevantPredictedHours.push(scheduler.status.forecast.output[i]);
            }
        }

        let power = 0; // Initialisation

        // Do we have enough predicted generation to reach 50% in time?
        if(predictedTotalGenerationWh > requiredWh) {
          power = scheduler.status.generation;
          scheduler.setAllowGridOut(false);
        } else {
          scheduler.setAllowGridOut(true);
          if(relevantPredictedHours.length > 0) {
            // Calculate how much is required from Grid ?
            const perHourCharging = requiredWh / relevantPredictedHours.length;
            power = perHourCharging;
            scheduler.setAllowBattery(false);
          } else {
            power = CP_POWERMAX;
            scheduler.setAllowBattery(true);
          }
        }

        if(power > CP_POWERMAX) power = CP_POWERMAX;
        if(power < 0) power = 0;
          scheduler.setCPPower(power);
      },
      end: async (scheduler) => {
        delete scheduler.status.priorityBstart
      }
    },
    {
      name:'C',
      soc:50,
      start: async (scheduler) => {
        scheduler.setAllowGridOut(true);
        scheduler.setAllowGridIn(false);
        scheduler.setAllowPV(true);
        scheduler.setAllowBattery(false);
      },
      run: async (scheduler) => {
        if(
            (typeof scheduler.status.forecast == 'undefined') ||
            (scheduler.status.forecast.updated < new Date().getTime()-3600000)
          ) {
                scheduler.status.forecast = await scheduler.predictionapi.retrieveForecast();
                scheduler.status.forecast.updated = new Date().getTime();
          }
          let relevantPredictedHours = [];
          let predictedTotalGenerationWh = 0;
          for(let i=0;i<scheduler.status.forecast.output.length;i++) {
            if(
                (scheduler.status.forecast.output[i].timestamp > new Date().getTime()-(1*3600000)) &&
                (scheduler.status.forecast.output[i].timestamp < scheduler.status.sessionStart + (48*3600000))
              ) {
                // We might limit in case generation is higher than CP_POWERMAX or EV_POWERMAX
                let predictedWh = scheduler.status.forecast.output[i].wh;
                if(predictedWh > CP_POWERMAX) predictedWh = CP_POWERMAX;
                if(predictedWh > EV_POWERMAX) predictedWh = EV_POWERMAX;
                predictedTotalGenerationWh += predictedWh;
                scheduler.status.forecast.output[i].usable = predictedWh;
                relevantPredictedHours.push(scheduler.status.forecast.output[i]);
              }
          }
          relevantPredictedHours.sort((a,b) => a.usable - b.usable);

          let power = scheduler.status.generation;

          // calculation for peak shaving
          let remainWh = (EV_FULL_CAPACITY) - ((scheduler.status.soc/100) * EV_FULL_CAPACITY); // Caution hardcoded 50% = start of PrioC
          for(let i=0;i<relevantPredictedHours.length;i++) {
            remainWh -= relevantPredictedHours[i].usable;
            if(
                 (relevantPredictedHours[i].timestamp > new Date().getTime()-(1*3600000)) &&
                 (relevantPredictedHours[i].timestamp < new Date().getTime()+(1*3600000)) &&
                 (power > relevantPredictedHours[i].usable)
               ) {
                 power = relevantPredictedHours[i].usable;
               }
          }
          scheduler.setCPPower(power);
      },
      end: async (scheduler) => {}
    }
  ];

  this.predictionapi = new libapi(CONFIG);

  const scheduler = this;

  /* Main process entry */
  this.run = async function() {

    if(scheduler.status.sessionStart == 0) scheduler.status.sessionStart = new Date().getTime();

    setInterval(async function() {
        if(scheduler.busy) return; else {
          scheduler.busy = true;
          try {
            // Figure out, what our latest Priority is.
            scheduler.status.nextPriority = null;
            for(let i=scheduler.priorities.length - 1;(i>=0) && (scheduler.status.nextPriority == null);i--) {
              if(scheduler.status.soc >= scheduler.priorities[i].soc) {
                scheduler.status.nextPriority = scheduler.priorities[i];
              }
            }

            // Check if we have a priority change from previous state
            if(scheduler.status.nextPriority.name !== scheduler.status.priority.name) {
                if(
                    (typeof scheduler.priority !== 'undefined') &&
                    (typeof scheduler.priority.stop !== 'undefined')
                  ) {
                    await scheduler.priority.stop(scheduler);
                  }
                await scheduler.status.nextPriority.start(scheduler);
            } else {
                await scheduler.status.nextPriority.run(scheduler);
            }

            scheduler.status.priority = scheduler.status.nextPriority;
            delete scheduler.status.nextPriority;
            scheduler.status.runner = "running";
          } catch(e) {
            console.error('RUNNER Exception',e);
          }
          scheduler.busy=false;
        }
    },RUNNER_INTERVAL);

  }

}
