import express from "express";
import { login, logout, refreshToken, register } from "../controllers/auth/auth.controller.js";
import authenticatedUser from "../middleware/auth.middleware.js"


const router = express.Router();


router.post("/refresh-token", refreshToken)
      .post("/logout", authenticatedUser, logout)
      .post("/register", register)
      .post("/login", login);


export default router;