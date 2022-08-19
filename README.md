# SolarEnergyPrediction-EVCharging

<a href="https://stromdao.de/" target="_blank" title="STROMDAO - Digital Energy Infrastructure"><img src="./static/stromdao.png" align="right" height="85px" hspace="30px" vspace="30px"></a>

**Electric Vehicle Charging - Scheduling Algorithm**

[Tutorial](https://rapidapi.com/stromdao-stromdao-default/api/solarenergyprediction/tutorials/solarenergyprediction-based-electric-vehicle-charging)

## Installation

Clone GIT Repository, copy runtime configuration, install dependencies

```
git clone https://github.com/energychain/SolarEnergyPrediction-EVCharging.git
cd SolarEnergyPrediction-EVCharging
mv sample.env .env
npm install
```

Adopt settings in `.env` file to your needs.

## Usage

This library is designed  to implement an alogrithm for EV-charging optimization based on Photovoltaics generation forecasts. You need to code/implement everyithing that is related to a particular architecture like reading the state-of-charge (SoC) cars API or setting loading power at the ChargePoint/Wallbox.

You might take check the stub implementation:

```
npm test
```

which executes `cli-test.js`

## [CONTRIBUTING](https://github.com/energychain/SolarEnergyPrediction-EVCharging/blob/main/CONTRIBUTING.md)

## [CODE OF CONDUCT](https://github.com/energychain/SolarEnergyPrediction-EVCharging/blob/main/CODE_OF_CONDUCT.md)


## Maintainer / Imprint

<addr>
STROMDAO GmbH  <br/>
Gerhard Weiser Ring 29  <br/>
69256 Mauer  <br/>
Germany  <br/>
  <br/>
+49 6226 968 009 0  <br/>
  <br/>
kontakt@stromdao.com  <br/>
  <br/>
Handelsregister: HRB 728691 (Amtsgericht Mannheim)
</addr>

Project Website: hhttps://rapidapi.com/stromdao-stromdao-default/api/solarenergyprediction/

## LICENSE
[MIT](./LICENSE)
