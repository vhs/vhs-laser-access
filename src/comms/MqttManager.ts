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
    private statusTopic: string
    private eventTopic: string

    constructor(server: string, statusSopic: string, eventTopic: string = 'laser/usage') {
        const mqttServer = server
        this.statusTopic = statusSopic
        this.eventTopic = eventTopic

        if (process.env.NODE_ENV !== 'test') {
            this.client = mqtt.connect(mqttServer, config.mqtt.options)

            this.client?.on('connect', () => {
                debug('Connected to MQTT broker')
                this.client?.subscribe(this.statusTopic, (err) => {
                    if (err) {
                        console.error(`Failed to subscribe to topic: ${this.statusTopic}`)
                    } else {
                        debug(`Subscribed to MQTT topic: ${this.statusTopic}`)
                    }
                })
            })

            this.client?.on('message', (topic, message) => {
                if (topic === this.statusTopic) {
                    this.maintenanceStatus = message.toString()
                    debug(`Received message on ${this.statusTopic}: ${this.maintenanceStatus}`)
                }
            })

            this.client?.on('error', (err) => {
                console.error('MQTT error:', err)
            })
        }

    }

    public sendUsage(event: string, userId: string) {
        debug(`sending mqtt usage event: ${event} for user: ${userId}`)
        this.client?.publish(this.eventTopic, JSON.stringify({
            event: event,
            userId: userId,
            timestamp: new Date().toISOString()
        }))
    }
}

export const mqttManager = new MqttManager(
    config.mqtt.server || "mqtt://127.0.0.1",
    config.mqtt.statusTopic || 'laser/maintenance',
    config.mqtt.eventTopic || 'laser/usage'
)
