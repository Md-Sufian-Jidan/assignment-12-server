const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
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

// middlewares 
const verifyToken = (req, res, next) => {
    // console.log('inside verify token', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    });
};

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
const bannersCollection = client.db('HealthScope').collection('banners');
const bookingsCollection = client.db('HealthScope').collection('bookings');

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // use verify admin after  
        // const verifyAdmin = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email };
        //     const user = await usersCollection.findOne(query);
        //     const isAdmin = user?.role === 'admin';
        //     if (!isAdmin) {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }
        //     next();
        // }

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
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
        // check a user is admin or guest  ,
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            // if (email !== req.decoded.email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });

        // adding a test verifyAdmin,
        app.post('/add-test', async (req, res) => {
            const test = req.body;
            const date = new Date();
            const testData = { ...test, date };
            const result = await testsCollection.insertOne(testData);
            res.send(result);
        });

        // all tests
        app.get('/all-tests', async (req, res) => {
            // const search = req.query.search || "";
            // let query = {
            //     productName: {
            //         $regex: search, $options: 'i'
            //     }
            // }
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

        // delete a single test  verifyAdmin,
        app.delete('/test-delete/:id', async (req, res) => {
            const id = req.params.id;
            console.log('deleted count', id);
            const query = { _id: new ObjectId(id) };
            const result = await testsCollection.deleteOne(query);
            res.send(result);
        });

        // Update a single test verifyAdmin, 
        app.put('/test-update/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const test = req.body;
            console.log(test);
            const query = { _id: new ObjectId(id) };
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

        // all users verifyAdmin, 
        app.get('/all-users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        // delete a user verifyAdmin,
        app.delete('/user-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        //  get a user info by email from db verifyAdmin,
        app.get('/role/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        });

        // add a banner  verifyAdmin,
        app.post('/add-banner', async (req, res) => {
            // /:email
            // const email = req.params.email;gi
            // let query = {};
            // if (email) {
            //     const query = { email: email };
            // }
            const banner = req.body;
            const result = await bannersCollection.insertOne(banner);
            res.send(result);
        });

        // all banners
        app.get('/all-banner', async (req, res) => {
            const result = await bannersCollection.find().toArray();
            res.send(result);
        });

        // set a banner to the home page
        app.patch('/update/banner/:id', async (req, res) => {
            const filter = { isActive: true };
            const updateIsActive = {
                $set: {
                    isActive: false,
                },
            };
            const actives = await bannersCollection.updateMany(filter, updateIsActive);
            // update a isActive to true
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    isActive: true
                },
            };
            const update = await bannersCollection.updateOne(query, updatedDoc);
            res.send(update);
        });

        // create stripe api
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const price = req.body.price;
            const priceInCent = parseFloat(price * 100);

            // generate client secret 
            // send client secret as response
            if (!price || priceInCent < 1) return;

            const { client_secret } = await stripe.paymentIntents.create({
                amount: priceInCent,
                currency: 'usd',
                automatic_payment_methods: {
                    enabled: true
                },
            });
            // send the client secret in the client side
            res.send({ client_secret: client_secret });
        });

        // Save a booking data in db
        app.post('/booking', async (req, res) => {
            const bookingData = req.body;
            const result = await bookingsCollection.insertOne(bookingData);
            res.send(result); 
        });

        // update a book status
        app.patch('/book/slot/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            // const status = req.body.status;
            const query = { _id: new ObjectId(id) };
            // const updateDoc = {
            //     $set: {
            //         booked: status
            //     },
            // };
            const updateRoom = await testsCollection.updateOne(query, { $inc: { slot: -1 } });
            res.send(updateRoom);
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