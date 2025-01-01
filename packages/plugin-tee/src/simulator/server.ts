import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Mock TDX Quote endpoint
app.post('/tdx-quote', (req, res) => {
    const { reportData } = req.body;
    console.log('Generating mock TDX quote for:', reportData);
    
    // Generate mock RTMR values (32 bytes each, hex encoded)
    const mockRtmrs = [
        '0'.repeat(64),
        '1'.repeat(64),
        '2'.repeat(64),
        '3'.repeat(64)
    ];

    // Generate a mock quote that matches the expected format
    const mockQuote = {
        quote: Buffer.from(JSON.stringify({
            reportData,
            rtmrs: mockRtmrs,
            timestamp: Date.now()
        })).toString('base64'),
        rtmrs: mockRtmrs,
        // Add these fields that the SDK expects
        mr_signer: '0'.repeat(64),
        mr_enclave: '1'.repeat(64),
        isv_prod_id: 0,
        isv_svn: 0,
        config_id: '2'.repeat(64),
        config_svn: 0
    };

    res.json(mockQuote);
});

// Mock key derivation endpoint
app.post('/derive-key', (req, res) => {
    const { path, salt } = req.body;
    console.log('Deriving mock key for path:', path);
    
    // Generate a deterministic key based on path and salt
    const mockKey = Buffer.from(`${path}-${salt}-${Date.now()}`).toString('base64');
    
    res.json({
        key: mockKey,
        path,
        salt
    });
});

const port = 8090;
app.listen(port, () => {
    console.log(`TEE Simulator running at http://localhost:${port}`);
});
