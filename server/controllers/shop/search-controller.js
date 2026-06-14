const Product = require("../../models/Product");
const { normaliseProduct } = require("./products-controller");

const searchProducts = async (req, res) => {
  try {
    const { keyword } = req.params;
    if (!keyword || typeof keyword !== "string") {
      return res.status(400).json({
        success: false,
        message: "Keyword is required and must be a string",
      });
    }

    const regEx = new RegExp(keyword, "i");

    // Search across both new fields (name) and legacy fields (title)
    const searchResults = await Product.find({
      status: "active",
      $or: [
        { name: regEx },
        { title: regEx },
        { description: regEx },
        { category: regEx },
        { brand: regEx },
      ],
    }).lean();

    res.status(200).json({
      success: true,
      data: searchResults.map(normaliseProduct),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error" });
  }
};

module.exports = { searchProducts };
