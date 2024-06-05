const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
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

// set email function
const sendEmail = async (emailAddress, emailMessage) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.email",
        port: 587,
        secure: false, // Use `true` for port 465, `false` for all other ports
        auth: {
            user: process.env.NODE_MAILER_EMAIL,
            pass: process.env.NODE_MAILER_PASS,
        },
    });

    // verify connection configuration
    transporter.verify(function (error, success) {
        if (error) {
            console.log(error);
        } else {
            console.log("Server is ready to take our messages");
        }
    });
    const mailBody = {
        from: `Health Scope 👩‍⚕️" <${process.env.NODE_MAILER_EMAIL}>`, // sender address
        to: emailAddress, // list of receivers
        subject: emailMessage.subject, // Subject line
        // text: "Hello world?", // plain text body
        html: emailMessage.message, // html body
    };
    const info = await transporter.sendMail(mailBody, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent', info.response);
        }
    });

    // console.log("Message sent: %s", info?.messageId);
}

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
const recommendationsCollection = client.db('HealthScope').collection('recommendations');

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
            const search = req.query.search;
            console.log(search);
            let query = {};
            if (query) {
                query = {
                    date: {
                        $regex: search, $options: 'i'
                    }
                }
            }
            console.log(query);
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
        // TODO: is work is not finish
        // download a single user data 
        app.post('/user/download', async (req, res) => {
            const user = req.body;
            // console.log(user);
            // get a single user
            const id = req.body._id;
            const query = { _id: new ObjectId(id) };
            const singleUser = await usersCollection.findOne(query);
            // get the users bookings
            const email = req.body.email;
            const filter = { 'guest.email': email };
            const userBookings = await bookingsCollection.find(filter).toArray();
            res.send({ singleUser, userBookings, });
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
            const query = { email: email }
            const result = await usersCollection.findOne(query);
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
            const id = bookingData.BookId;
            const query = { _id: new ObjectId(id) };
            const update = testsCollection.updateOne(query, { $inc: { mostBooked: 1 } })
            const result = await bookingsCollection.insertOne(bookingData);
            // sending a email to the guest
            sendEmail(bookingData?.guest?.email, {
                subject: "Your Test Booking Confirmation with Health Scope",
                message: `Dear ${bookingData?.guest?.name},

                Thank you for booking your diagnostic test with Health Scope. We are pleased to confirm your appointment and look forward to assisting you with your health needs.
                
                If you have any questions or need further assistance, please feel free to contact us.
                
                Best regards,
                The Health Scope Team
                
                © 2024-2025 Health Scope. All rights reserved.`
            });
            // sending a email to the guest
            sendEmail(bookingData?.host?.email, {
                subject: "Your Test Booking Confirmation with Health Scope",
                message: `Dear ${bookingData?.host?.name},
                Dear ${bookingData?.host?.name},

                This is to inform you that a new test booking has been made on [Your Website Name].
                
                Details:
                
                User Name: ${bookingData?.guest?.name}
                Test Name: ${bookingData?.name}
                Booking Date: ${bookingData?.date}
                Test Date: From ${bookingData?.from} to ${bookingData?.to}
                User Contact: ${bookingData?.guest?.email}
                Please ensure that all necessary preparations are made for the upcoming test.
                
                Thank you for your attention to this matter.
                
                Best regards,
                The Health Scope System
                
                © 2024-2025 Health Scope. All rights reserved.`
            });
            res.send(result);
        });

        // update a book slot
        app.patch('/book/slot/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updateRoom = await testsCollection.updateOne(query, { $inc: { slot: -1 } });
            res.send(updateRoom);
        });

        // get all the booked test
        app.get('/booked/test', async (req, res) => {
            const result = await bookingsCollection.find().toArray();
            res.send(result);
        });

        //get all the appointments of a user
        app.get('/appointments/:email', async (req, res) => {
            const email = req.params.email;
            const query = { 'guest.email': email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        });

        // make a user to a admin
        app.patch('/user/role/:id', async (req, res) => {
            const id = req.params.id;
            const role = req.body;
            console.log(role);
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: role
            };
            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        // change a user status
        app.patch('/user/status/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: status
            };
            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        // update report status
        app.patch('/reservation-status/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'deliver'
                }
            }
            const result = await bookingsCollection.updateOne(query, updatedDoc);
            res.send(result);
        });
        // delete a reservation report 
        app.delete('/reservation-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        });

        // get all the recommendations
        app.get('/recommendations', async (req, res) => {
            const result = await recommendationsCollection.find().toArray();
            res.send(result);
        });

        // delete a appointment
        app.delete('/delete/appointment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/admin-statistic', async (req, res) => {
            const totalUsers = await usersCollection.estimatedDocumentCount();
            const bookingDetails = await bookingsCollection.estimatedDocumentCount();
            const mostlyBooked = await testsCollection.find({}, {
                projection: {
                    mostBooked: 1,
                    price: 1,
                    testCategory: 1,
                }
            }
            ).toArray();
            const totalSales = mostlyBooked.reduce((acc, item) => (acc + item.price), 0);

            res.send({ totalUsers, bookingDetails, totalSales, mostlyBooked });
        })
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
});