import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = router()

router.route("/register").post(registerUser)

export default router