import debugLib from 'debug'
import mqtt from 'mqtt'
import { config } from '../Configuration'

const debug = debugLib('laser:mqtt')


// We use MQTT to receive maintenance status updates from the laser controller
// This still needs some work, as the laser status isn't very visible to the user yet
// but if we get anything other than "ok" here the laser will not start up
export class MqttManager {
    private client: mqtt.MqttClient | null = null
    public maintenanceStatus: string = 'ok'

    constructor() {
        const mqttServer = config.mqtt.server || "mqtt://127.0.0.1"
        const mqttTopic = config.mqtt.topic || 'laser/maintenance'

        if (process.env.NODE_ENV !== 'test') {
            const mqttClient = mqtt.connect(mqttServer, config.mqtt.options)

            mqttClient.on('connect', () => {
                debug('Connected to MQTT broker')
                mqttClient.subscribe(mqttTopic, (err) => {
                    if (err) {
                        console.error(`Failed to subscribe to topic: ${mqttTopic}`)
                    } else {
                        debug(`Subscribed to MQTT topic: ${mqttTopic}`)
                    }
                })
            })

            mqttClient.on('message', (topic, message) => {
                if (topic === mqttTopic) {
                    this.maintenanceStatus = message.toString()
                    debug(`Received message on ${mqttTopic}: ${this.maintenanceStatus}`)
                }
            })

            mqttClient.on('error', (err) => {
                console.error('MQTT error:', err)
            })
        }

    }
}

export const mqttManager = new MqttManager()
