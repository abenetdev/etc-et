const express = require("express");
const { getHomeData } = require("../../controllers/shop/home-controller");
const router = express.Router();

router.get("/", getHomeData);

module.exports = router;
