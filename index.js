const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 9000;

const options = {
    origin: [
        "http://localhost:5173",
        "https://cardoctor-bd.web.app",
        "https://cardoctor-bd.firebaseapp.com",
    ],
    credentials: true,
    optionSuccessStatus: 200,
}
//middlewares
app.use(cors(options));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Diagnostic center is open');
});

app.listen(port, () => {
    console.log('server is running', port);
})