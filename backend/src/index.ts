import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import nacl from 'tweetnacl';
import nacl_util from 'tweetnacl-util';
import { PublicKey } from '@solana/web3.js';

const app = new Hono<{ Bindings: Env }>();

interface Message {
	timestamp: string;
	data?: any;
}

app.post(
	'/sync',
	zValidator(
		'json',
		z.object({
			publicKey: z.string(),
			message: z.string(), // used for other data, else we can only use timestamp as message to validate user
			signature: z.string(),
		}),
	),
	async (c) => {
		// add health validation logic & send sync_data instruction (if verified)
		// 1) google-fit (deprecated)
		// 2) fitbit
		// 3) health connect (local only, we can (for now) use message to get steps from android health connect app)

		const { publicKey, signature, message } = c.req.valid('json');

		const messageBytes = nacl_util.decodeUTF8(message);
		const signatureBytes = new TextEncoder().encode(signature);
		const publicKeyBytes = new PublicKey(publicKey).toBytes();

		const result = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

		if (result) {
			const parsedMessage: Message = JSON.parse(message);
			// currently health connect api only (get steps from message)
			if (parsedMessage.data.steps) {
				// todo: sign and send transaction
				return c.json({ message: 'synced successfully' }, 200);
			} else {
				return c.json({ message: 'health connect only supported' }, 400);
			}
		} else {
			// failed
			return c.json({ message: 'invalid signature' }, 400);
		}
	},
);

export default app;
