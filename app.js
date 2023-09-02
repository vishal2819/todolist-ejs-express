const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Define the Mongoose schema
const itemsSchema = {
  name: String,
};

// Define the Mongoose model
const Item = mongoose.model("Item", itemsSchema);

async function startServer() {
  try {
    await mongoose.connect(
      "mongodb://localhost:27017/todolist-v2",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("Connected to MongoDB");

    // Insert default items if they don't exist
    await insertDefaultItems();

    app.listen(3000, function () {
      console.log("Server started on port 3000");
    });
  } catch (error) {
    console.log("Error starting server:", error.message);
  }
}

// Start the server and connect to the database
startServer();

// Insert default items
const defaultItems = [
  { name: "Buy Food" },
  { name: "Cook Food" },
  { name: "Cook Food" },
  { name: "Eat Food" },
];

const listSchema = {
  name: String,
  items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);

async function insertDefaultItems() {
  try {
    const count = await Item.countDocuments();
    if (count === 0) {
      await Item.insertMany(defaultItems);
      console.log("Saved default items to the database");
    }
  } catch (error) {
    console.log("Error saving default items:", error.message);
  }
}

async function findItems() {
  try {
    const foundItems = await Item.find();
    return foundItems;
  } catch (error) {
    console.log("Error finding items:", error.message);
  }
}

app.get("/", function (req, res) {
  try {
    Item.find().then((foundItems) => {
      if (foundItems.legth === 0) {
        insertDefaultItems();
        res.redirect("/");
      } else {
        res.render("list", { listTitle: "Today", newListItems: foundItems });
      }
    });
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({ name: customListName }).then((foundList) => {
    if (!foundList) {
      // Create a new list
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      list.save();
      res.redirect("/" + customListName);
    } else {
      // Show an existing list
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  });
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName,
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName })
    .then((foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function (req, res) {
  const checkedItem = req.body.checkbox;
  const listName = req.body.list;

  if (listName === "Today") {
    Item.findByIdAndDelete(checkedItem)
      .then(() => {
        console.log("Item deleted");
      })
      .catch((err) => {
        console.log(err);
      });
    res.redirect("/");
  }else{
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItem}}})
    .then(() => {
      res.redirect("/" + listName);
    })
  }
});