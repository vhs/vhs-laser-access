# Laser Access Controller

Used to automate the startup and shutdown of the laser cutter and all of the dependant devices from a Raspberry Pi

It is also used to control access to the laser. Access is handled by the membership management application.

## Wiring

* Chiller Relay - GPIO17, pin 11 - Green Wire Pin 4
* Ventilation Relay - GPIO27 pin 13 - Orange Wire Pin 5
* Laser Relay - GPIO22 pin 15 - White Wire Pin 3
* Main On/Off Switch - GPIO4 pin 7
* Green LED - GPIO23 pin 16
* Red LED - GPIO24 pin 18

The following pins are used for NFC but it's currently not enabled.

* Buzzer - GPIO18 pin 12
* NFC Reset GPIO25 pin 22
* NFC MOSI GPIO10 pin 19
* NFC MOSO GPIO09 pin 21
* NFC CLK GPIO11 pin 23
* NFC CE0 GPIO08 pin 24
* NFC CE1 GPIO07 pin 26

## Installation [Ubuntu Installation below]

Install node.js, one way is with this arm package

    wget http://node-arm.herokuapp.com/node_latest_armhf.deb
    sudo dpkg -i node_latest_armhf.deb

After node.js is installed from the root of the project run:

    npm install

When installing on the production device you don't need to install the dev dependencies.

    npm install --production

Installing on a RPi does take a while.

## Ubuntu installation

     https://nodejs.org/en/download/package-manager/

## Config

Start by adding a new config.json file, see config.json.sample for an example.

## OAuth Access

When setting up OAuth providers, the callback set in the provider should be http://<host>/oauth/(github|google|slack)/callback.

For google callbacks you cannot use internal IP addresses however you can use a host name with a valid domain name regardless if
the IP resolves to an internal or external address.

## Testing

If dev dependencies are installed you can run all test cases with

    npm test

## Running

To set the port set the environment variable PORT to whatever port you want to listen to, by default it's 3000

    npm start

To enable debug logging then set the environment variable DEBUG to laser:* to log all laser related events.
