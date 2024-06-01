const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

const testsCollection = client.db('HealthScope').collection('tests');
const usersCollection = client.db('HealthScope').collection('users');

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // USER DATA SAVE APi
        app.post('/save/user', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        // check a user is admin or guest verifyToken,
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;

            // if (email !== req.decoded.email) {
            //   return res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });

        // adding a test 
        app.post('/add-test', async (req, res) => {
            const test = req.body;
            const date = new Date();
            const testData = { ...test, date };
            const result = await testsCollection.insertOne(testData);
            res.send(result);
        });

        // all tests
        app.get('/all-tests', async (req, res) => {
            const result = await testsCollection.find().toArray();
            res.send(result);
        });

        // get a single data to the homepage
        app.get('/details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await testsCollection.findOne(query);
            res.send(result);
        });

        // delete a single test
        app.delete('/test-delete/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new Object(id) };
            const result = await testsCollection.deleteOne(query);
            res.send(result);
        });

        // Update a single test
        app.put('/test-update/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const test = req.body;
            console.log(test);
            const query = { _id: new Object(id) };
            console.log(query);
            const updatedDoc = {
                $set: {
                    ...test
                },
            };
            const options = { upsert: true };
            const result = await testsCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        //get a single test
        app.get('/single-test/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await testsCollection.findOne(query);
            res.send(result);
        });

        // all users
        app.get('/all-users', async (req, res) => {
            const result = await usersCollection.find().toArray();
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