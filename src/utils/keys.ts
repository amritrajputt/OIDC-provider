import { generateKeyPairSync } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const keyPair = () => {
    const {privateKey, publicKey} = generateKeyPairSync('rsa',{
        modulusLength: 2048,
        publicKeyEncoding: {type: 'spki', format: 'pem'}, // spki = subject public key info
        privateKeyEncoding: {type: 'pkcs8', format: 'pem'} // pkcs8 = private key cryptography standard 
        // pem = privacy enhanced mail
    })
    return {privateKey, publicKey}
}
const {privateKey,publicKey} = keyPair();
console.log(privateKey);

export default keyPair
