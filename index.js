const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 9000;

const options = {
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://cardoctor-bd.web.app",
        "https://cardoctor-bd.firebaseapp.com",
    ],
    credentials: true,
    optionSuccessStatus: 200,
}
//middlewares
app.use(cors(options));
app.use(express.json());
//-------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvjjrvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const usersCollection = client.db('HealthScope').collection('users');

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // USER DATA SAVE APi
        app.post('/save/user', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Diagnostic center is open');
});

app.listen(port, () => {
    console.log('server is running', port);
})