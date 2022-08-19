require('dotenv').config();

const CONFIG = process.env;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const app = async function() {
    const SCHEDULER = require("./scheduler.js");
    const scheduler = new SCHEDULER(CONFIG);
    scheduler.run();

    scheduler.emitter.on("setCPPower",function(l) {
      console.log("STUB:setCPower",l);
    });

    scheduler.emitter.on("setAllowGridOut",function(l) {
      console.log("STUB:setCPower",l);
    });

    scheduler.emitter.on("setAllowGridIn",function(l) {
      console.log("STUB:setCPower",l);
    });

    scheduler.emitter.on("setAllowPV",function(l) {
      console.log("STUB:setCPower",l);
    });

    scheduler.emitter.on("setAllowBattery",function(l) {
      console.log("STUB:setCPower",l);
    });

    for(let i=40;i<100;i++) {
      try  {
        let state = {
          soc:scheduler.status.soc,
          generation:scheduler.status.generation,
          state:scheduler.status.runner,
          priority:scheduler.status.priority.name
        };
        console.table([state]);
        scheduler.status.soc = i;
        let generationChange = Math.round(Math.random() * 100) - 50;
        scheduler.status.generation += generationChange;
        await sleep(1001);
      } catch(e) {
        console.log(e);
      }
    }
}

app();
