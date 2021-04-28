const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      require: true,
      max: 32,
    },
    slug: {
        type: String,
        unique: true,
        //? We will require the tag base on the slug that is why index = true
        //? example of slug format is: new-arrival
        index: true,
      },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tag", tagSchema);
