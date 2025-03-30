import express from 'express';
import { askQuestion } from '../bot/agentBot';
import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const webhookRouter = express.Router();

/**
 * @swagger
 * /webhook/twilio:
 *   post:
 *     summary: Receive and respond to messages via Twilio
 *     tags:
 *       - Webhook
 *     description: Handles incoming messages from Twilio and sends a response using the bot agent.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               Body:
 *                 type: string
 *                 description: The message received
 *               From:
 *                 type: string
 *                 description: Sender's phone number
 *     responses:
 *       200:
 *         description: Message received and processed successfully
 */
webhookRouter.post('/twilio', twilio.webhook(process.env.TWILIO_AUTH_TOKEN, {
    validate: process.env.NODE_ENV === 'production'
}), (req, res) => {
    const message = req.body.Body;
    const sender = req.body.From;
    
    askQuestion(message, sender).then((response) => {
        console.log(`Response: ${response}`);
        //   Send automatic response
        client.messages.create({
            body: response,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: sender
        }).then(message => console.log(message.sid)).catch(console.error);
    }).catch(console.error);

    res.status(200).send('OK');
});

export default webhookRouter;
