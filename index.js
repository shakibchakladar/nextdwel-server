const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middlewar
app.use(cors());
app.use(express.json());

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Timestamp,
} = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9ttivus.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const advertiesmentCollection = client
      .db("nextDwelldb")
      .collection("advertisement");
    const propertiesCollection = client
      .db("nextDwelldb")
      .collection("properties");
    const usersCollection = client.db("nextDwelldb").collection("users");

    const wishlistCollection = client.db("nextDwelldb").collection("wishlist");

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      console.log("hello");
      const user = req.user;
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);
      console.log(result?.role);
      if (!result || result?.role !== "admin")
        return res.status(401).send({ message: "forbidden access" });
      next();
    };

    // auth related api
    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "365d",
    //   });
    //   res
    //     .cookie("token", token, {
    //       httpOnly: true,
    //       secure: process.env.NODE_ENV === "production",
    //       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    //     })
    //     .send({ success: true });
    // });

    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
        console.log("Logout successful");
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.put("/user", async (req, res) => {
      const user = req.body;

      const query = { email: user?.email };
      // check if user already exists in db
      const isExist = await usersCollection.findOne(query);
      // console.log(isExist);
      if (isExist) {
        if (user.status === "Requested") {
          // if existing user try to change his role
          const result = await usersCollection.updateOne(query, {
            $set: { status: user?.status },
          });
          return res.send(result);
        } else {
          // if existing user login again
          return res.send(isExist);
        }
      }

      // save user for the first time
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // get a user info by email from db
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    //update a user role
    app.patch("/users/update/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email };
      const updateDoc = {
        $set: { ...user, timestamp: Date.now() },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // get all users from db
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/advertiesment", async (req, res) => {
      const result = await advertiesmentCollection.find().toArray();
      res.send(result);
    });

    app.get("/properties", async (req, res) => {
      const result = await propertiesCollection.find().toArray();
      res.send(result);
    });

    app.get("/singleProperty/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }
        const result = await propertiesCollection.findOne({
          _id: new ObjectId(id),
        });
        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ message: "Property not found" });
        }
      } catch (error) {
        console.error("Error retrieving property:", error);
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });

    // save a property data in db
    app.post("/add-property", async (req, res) => {
      const propertyData = req.body;
      const result = await propertiesCollection.insertOne(propertyData);
      res.send(result);
    });

    // delete a property
    app.delete("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.deleteOne(query);
      res.send(result);
    });

    // update a property
    app.put("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedProperty = req.body;
      const property = {
        $set: {
          property_title: updatedProperty.property_title,
          property_location: updatedProperty.property_location,
          price_range: updatedProperty.price_range,
          property_image: updatedProperty.property_image,
          agent_email: updatedProperty.agent_email,
          agent_name: updatedProperty.agent_name,
        },
      };
      const result = await propertiesCollection.updateOne(
        filter,
        property,
        options
      );
      res.send(result);
    });

    // save wishlist property in db

    app.post("/add-wishlist", async (req, res) => {
      const wishlistData = req.body;
      try {
        const result = await wishlistCollection.insertOne(wishlistData);
        res
          .status(200)
          .send({
            message: "Item added to wishlist successfully",
            data: result,
          });
      } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).send({ message: "Failed to add item to wishlist" });
      }
    });

    // delete wishlist data 
    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // get wishlist data 
    app.get("/wishlist", async (req, res) => {
      const result = await wishlistCollection.find().toArray();
      res.send(result);
    });

    // get all property for agent
    app.get("/my-added/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(req.params);

      const query = { agent_email: email };

      try {
        const result = await propertiesCollection.find(query).toArray();
        res.json(result); // Ensure the response is JSON
      } catch (error) {
        console.error("Error fetching properties:", error);
        res.status(400).json({ error: "Internal Server Error" }); // Respond with JSON in case of an error
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("nextdwell server is running");
});

app.listen(port, () => {
  console.log(`server is running on port : ${port}`);
});
