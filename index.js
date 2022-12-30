const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2yzw1bb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log("url",uri);

client.connect(() => {
    console.log('connected');
})

//  JSON WEB TOKEN

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}



async function run() {
    try {
        await client.connect();
        // ALL COLLECTIONS
        const postCollection = client.db('nolax').collection('postCollection');
        const userCollection = client.db('nolax').collection('users');
        const commentCollection = client.db('nolax').collection('commentCollection');

        // Adding new post in UI and database
        app.post('/post', verifyJWT, async (req, res) => {
            const post = req.body;
            const result = await postCollection.insertOne(post);
            res.send(result);
        });
        // Adding new commetn in UI and database
        app.post('/comment', async (req, res) => {
            const comment = req.body;
            const result = await commentCollection.insertOne(comment);
            res.send(result);
        });

        // get comments
        // Getting all post to show in media page
        app.get('/comment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { postId: id };
            const cursor = commentCollection.find(query);
            const comment = await cursor.toArray();
            console.log(comment)
            res.send(comment);
        });


        // Getting all post to show in media page
        app.get('/posts', async (req, res) => {
            const query = {};
            const cursor = postCollection.find(query);
            const posts = await cursor.toArray();
            res.send(posts);
        });

        // Getting data for purchase tool
        app.get('/posts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const post = await postCollection.findOne(query);
            res.send(post);
        });

        // Use Token DONT ADD JWT HERE
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };

            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        })

        // Making admin
        app.put('/post/:postID', verifyJWT, async (req, res) => {
            console, log(req?.params);
            const postID = req.params._id;
            const filter = { _id: postID };
            const updateDoc = {
                $set: { like: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        app.put('/updateLike/:postID', async (req, res) => {
            const postID = req.params.postID;
            const filter = { _id: ObjectId(postID) };
            const post = await postCollection.findOne(filter);
            console.log(post);
            const updateDoc = {
                $set: { like: post.like ? post?.like + 1 : 0 + 1 },
            };
            const result = await postCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        // Updating My profile in Dashboard
        app.post("/about/:email", async (req, res) => {
            const email = req.params.email;
            const changes = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updatedDoc = {
                $set: changes
            }
            const updatedUser = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(updatedUser)
        })

        // Getting data for my profile
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query);
            res.send(result)
        })

    } finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello From Nolax!')
})

app.listen(port, () => {
    console.log(`Nolax listening on port ${port}`)
})