# Laser Access Controller

Used to automate the startup and shutdown of the laser cutter and all of the dependant devices from a Raspberry Pi

It is also used to control access to the laser. Access is handled by the membership management application.

# Running the app

1. install `node` (v22 or greater, ideally) and `yarn`.
2. create a `./config.json` file, see `./src/Configuration.ts` for the schema of this file.
3. `yarn install` will install packages.
4. `yarn build` will compile the typescript code into `./dist`.
5. `yarn start` will compile the code and run it.
6. `yarn test` will compile the code and test it.
7. visit `http://127.0.0.1:3000/` to view the running server

## Runtime options

- `NODE_ENV=test yarn start` disable mqtt while running (see `./comms/MqttManager.ts`)
- `yarn start -- --gpio-in` for testing, type 0+newline or 1+newline to toggle the main switch on and off (see `./src/hardware/MockGpio.ts`)
- `yarn node ./dist/main.js` run without re-compiling first
- `NODE_ENV=test yarn node ./dist/main.js --gpio-in` combine all of the above

# MQTT for Maintanance Status

This app will check for "ok" status over MQTT before allowing the laser switch to be unlocked. This status is set by LCC and gives the LCC a quick way to take the laser out of service whenever necessary.

# Deploying to a raspberry pi

This code is to be run on a raspberry pi at the hack space, with a "hat" board on it that provides the relays, switches, and other connections. Here are instructions for getting it running on a pi:

1. Flash Raspbian to an SD card
    - user laser passwork hacktheplanet
2. Boot the pi from the sd card, and ssh to it or use keyboard+monitor.
    - complete any setup you're prompted with.
3. Install necessary software:
    - `sudo apt update` update package lists
    - `sudo apt install git vim` life without `git` and `vim` is no life at all.
    - install node. Per instructions [here](https://gist.github.com/stonehippo/f4ef8446226101e8bed3e07a58ea512a) nodesource and the official nodejs builds don't work on a pi v1, so we have to use an unofficial build
        - `wget https://unofficial-builds.nodejs.org/download/release/v22.19.0/node-v22.19.0-linux-armv6l.tar.gz` 
        - `tar -xvf node-v22.19.0-linux-armv6l.tar.gz` unzip it
        - `sudo mv node-vX.X.X-linux-armv6l /usr/local/node` put it in place
        - `cd /usr/bin`
        - `sudo ln -s /usr/local/node/bin/node node`
        - `sudo ln -s /usr/local/node/bin/npm npm`
        - `node -v` verify that the Node.js install worked
        - `npm -v`  verify that the npm install worked
        - `echo PATH="/usr/local/node/bin:\$PATH" >> ~/.profile` add node global binaries path to your profile
        - `source ~/.profile` reload .profile to activate the new PATH
    - `npm install -g corepack` install yarn, the project's preferred package manager (others probably work).
    - `corepack enable` enable yarn
4.  checkout this repo, build, and run
    - `git clone https://github.com/vhs/vhs-laser-access` checkout repo
    - `cd vhs-laser-access` enter repo
    - `git fetch origin stripdown && git checkout stripdown` for now, we're using a version off the main branch
    - `yarn install` install repo dependencies
    - setup a `config.json` file with the structure described in `src/Configuration.ts`
    - `yarn start` run for the first time - visit it at `http://laser.local:3000/`
5. Persist the web app with pm2
    - `yarn global add pm2` install `pm2`, which starts and restarts the webapp if it crashes or the system reboots
    - `echo "export PATH=\"\$(yarn global bin):\$PATH\"" >> ~/.profile` add yarn global binary path to your PATH
    - `source ~/.profile` reload PATH from .profile
    - `pm2 startup` follow instructions - this persists pm2, so it starts on boot
    - `pm2 start dist/main.js --name laser` run the app
    - `pm2 save` make sure the app re-starts if the system is reset

# Wiring

- Chiller Relay - GPIO17, pin 11 - Green Wire Pin 4
- Ventilation Relay - GPIO27 pin 13 - Orange Wire Pin 5
- Laser Relay - GPIO22 pin 15 - White Wire Pin 3
- Main On/Off Switch - GPIO4 pin 7
- Green LED - GPIO23 pin 16
- Red LED - GPIO24 pin 18

The following pins are used for NFC but it's currently not enabled.

- Buzzer - GPIO18 pin 12
- NFC Reset GPIO25 pin 22
- NFC MOSI GPIO10 pin 19
- NFC MOSO GPIO09 pin 21
- NFC CLK GPIO11 pin 23
- NFC CE0 GPIO08 pin 24
- NFC CE1 GPIO07 pin 26
