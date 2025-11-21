import express from "express";
import { login, logout, refreshToken, register } from "../controllers/auth/auth.controller.js";
import authenticatedUser from "../middleware/auth.middleware.js"
import { checkEmail } from "../controllers/auth/email.controller.js";
import { signingWithOauth } from "../controllers/auth/oauth.controller.js";
import { sendOtp, verifyOtp } from "../controllers/auth/otp.controller.js";
import { getProfile, setLoginPinFirst, updateProfile, verifyPin } from "../controllers/auth/user.controller.js";
import { uploadBiometrics, verifyBiometricKey } from "../controllers/auth/biometrics.controller.js";


const router = express.Router();


router.post("/refresh-token", refreshToken)
      .post("/logout", authenticatedUser, logout)
      .post("/register", register)
      .post("/login", login)
      .post("/check-email", checkEmail)
      .post("/auth", signingWithOauth)
      .post("/verify-otp", verifyOtp)
      .post("/send-otp", sendOtp)
      .post("/set-pin", authenticatedUser, setLoginPinFirst)
      .post("/verify-pin", authenticatedUser, verifyPin)
      .post("/upload-biometric", authenticatedUser, uploadBiometrics)
      .post("/verify-biometric", authenticatedUser, verifyBiometricKey)
      .post("/refresh-token", refreshToken)
      .post("/logout", logout);

router.route("/profile").get(authenticatedUser, getProfile).put(authenticatedUser, updateProfile);


export default router;