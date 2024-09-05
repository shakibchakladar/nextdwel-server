const express = require('express');
const cors = require('cors');
const app =express();
require('dotenv').config()
const port =process.env.PORT ||5000;

// middlewar
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9ttivus.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const advertiesmentCollection=client.db('nextDwelldb').collection('advertisement')
    const propertiesCollection=client.db('nextDwelldb').collection('properties')

    app.get('/advertiesment',async(req,res)=>{
        const result=await advertiesmentCollection.find().toArray();
        res.send(result);

    })

    app.get('/properties',async(req,res)=>{
      const result=await propertiesCollection.find().toArray();
      res.send(result)
    })

    app.get('/singleProperty/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid ID format' });
        }
        const result = await propertiesCollection.findOne({ _id: new ObjectId(id) });
        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ message: 'Property not found' });
        }
      } catch (error) {
        console.error('Error retrieving property:', error);
        res.status(500).send({ message: 'Internal Server Error', error });
      }
    });


    // save a property data in db
    app.post('/add-property',async(req,res)=>{
      const propertyData=req.body
      const result=await propertiesCollection.insertOne(propertyData)
      res.send(result)
    })
   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('nextdwell server is running')
})


app.listen(port,()=>{
    console.log(`server is running on port : ${port}`)
})
