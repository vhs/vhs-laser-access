// configuration lives in ../config.json
// this is the type definition for it, with example values in comments

export interface Configuration {
    mqtt: {
        server: string // "mqtt://127.0.0.1"
        options: any // null
        topic: string // "laser/maintenance"
    },
    api: {
        baseUrl: string // "https://api.vanhack.ca"
        clientName: string // "<clientName>"
        clientSecret: string // "<clientSecret>"
    },
    port: number
}

export const config: Configuration = require('../config.json');
