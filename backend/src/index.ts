import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import nacl from 'tweetnacl';
import nacl_util from 'tweetnacl-util';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import IDL from '../idl.json';
import { Solfit } from '../../anchor-program/target/types/solfit';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

app.use(cors());

const rpcUrl = `https://devnet.helius-rpc.com/?api-key=3306ede2-b0da-4ea3-a571-50369811ddb4`;
const connection = new Connection(rpcUrl);
const PROGRAM_ID = new PublicKey('HGJ5aduNj8zgTthPEXf3hgmmEy19MmCpSu3PzwhPedCd');
const program = new Program<Solfit>(
	IDL as Solfit,
	PROGRAM_ID,
	new AnchorProvider(
		connection,
		new NodeWallet(
			Keypair.fromSecretKey(
				// signer publickey
				Uint8Array.from([
					215, 175, 51, 88, 217, 246, 72, 79, 154, 99, 18, 251, 106, 198, 78, 137, 186, 221, 225, 142, 144, 230, 117, 113, 225, 5, 88, 207,
					191, 244, 158, 247, 9, 235, 112, 3, 217, 86, 60, 161, 67, 98, 95, 199, 73, 70, 102, 218, 41, 63, 91, 169, 212, 203, 145, 215, 112,
					192, 243, 21, 153, 120, 11, 203,
				]),
			),
		),
		{ skipPreflight: true, commitment: 'processed', preflightCommitment: 'processed' },
	),
);

interface Message {
	timestamp: string;
	data?: any;
}

app.post(
	'/sync',
	zValidator(
		'json',
		z.object({
			challenge: z.string(),
			publicKey: z.string(),
			message: z.string(), // used for other data, else we can only use timestamp as message to validate user
			signature: z.string(),
		}),
	),
	async (c) => {
		try {
			// add health validation logic & send sync_data instruction (if verified)
			// 1) google-fit (deprecated)
			// 2) fitbit
			// 3) health connect (local only, we can (for now) use message to get steps from android health connect app)

			const { challenge, publicKey, signature, message } = c.req.valid('json');

			console.log({ challenge, publicKey, signature, message });

			const messageBytes = nacl_util.decodeUTF8(message);
			const signatureBytes = bs58.decode(signature);
			const publicKeyBytes = new PublicKey(publicKey).toBytes();

			const result = nacl.sign.detached.verify(messageBytes, Uint8Array.from(signatureBytes), publicKeyBytes);

			if (result) {
				const parsedMessage: Message = JSON.parse(message);
				// currently health connect api only (get steps from message)
				if (parsedMessage.data.steps) {
					const participantSeed = Buffer.from('participant');
					const [participant] = PublicKey.findProgramAddressSync(
						[participantSeed, new PublicKey(challenge).toBuffer(), new PublicKey(publicKey).toBuffer()],
						PROGRAM_ID,
					);

					const txsign = await program.methods
						.syncData(new BN(parseInt(parsedMessage.data.steps)))
						.accounts({
							challenge: new PublicKey(challenge),
							participant,
							signer: new PublicKey('fithqevcksfXZJcLvje3kfybGLxCNTYAi18BJEZJdMk'),
							user: new PublicKey(publicKey),
							systemProgram: SystemProgram.programId,
						})
						.rpc();

					return c.json({ message: 'synced successfully', txsign }, 200);
				} else {
					return c.json({ message: 'health connect only supported' }, 400);
				}
			} else {
				// failed
				return c.json({ message: 'invalid signature' }, 400);
			}
		} catch (e) {
			return c.json({ message: 'timeout' }, 418);
		}
	},
);

export default app;
