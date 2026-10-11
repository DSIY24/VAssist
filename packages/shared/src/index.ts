export const APP_NAME = "VAssist";

export { contract, type Contract } from "./contract";
export {
    createWorkspaceInputSchema,
    workspaceNameSchema,
    workspaceSchema,
    type CreateWorkspaceInput,
    type Workspace,
} from "./workspace";
export {
    emailInputSchema,
    emailSchema,
    loginInputSchema,
    newPasswordSchema,
    resetPasswordInputSchema,
    signupInputSchema,
    verificationCodeSchema,
    type EmailInput,
    type LoginInput,
    type ResetPasswordInput,
    type SignupInput,
} from "./auth";
