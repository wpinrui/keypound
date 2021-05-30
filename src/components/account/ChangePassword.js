import React, { useEffect } from "react";
import { Form, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import useAuthForm from "./utility/useAuthForm";
import {
    Password,
    PasswordConfirm,
    Submit,
    authStyle,
    Message,
    Dialog,
} from "./utility/AuthSheets";

export default function ChangePassword() {
    const {
        passwordRef,
        passwordConfirmRef,
        changePassword,
        currentUser,
        error,
        setError,
        message,
        setMessage,
        loading,
        setLoading,
        isHidden,
        setIsHidden,
    } = useAuthForm("password");

    const successMsg = "Successfully updated profile.";

    useEffect(() => {
        !currentUser &&
            setError((prev) =>
                message === successMsg ? prev : "Error: You must be logged in."
            );
    }, [message, setError, currentUser]);

    function handleSubmit(e) {
        e.preventDefault();
        if (!currentUser) {
            return;
        }
        if (passwordRef.current.value !== passwordConfirmRef.current.value) {
            return setError("Passwords do not match");
        }
        setMessage("");
        setError("");
        setLoading(true);

        changePassword(passwordRef.current.value)
            .then(() => {
                setMessage("Password updated successfully.");
                setIsHidden(true);
            })
            .catch((error) => {
                setError(error.message);
                setLoading(false);
            });
    }

    const placeholder = "Leave blank to keep the same.";
    return (
        <Dialog>
            <Card>
                <Card.Body>
                    <h2 className={authStyle.title}>Change Password</h2>
                    <Message error={error} message={message} />
                    {!isHidden && (
                        <Form onSubmit={handleSubmit}>
                            <Password
                                reference={passwordRef}
                                placeholder={placeholder}
                                onChange={() => {
                                    setMessage("");
                                    setError("");
                                }}
                            />

                            <PasswordConfirm
                                reference={passwordConfirmRef}
                                placeholder={placeholder}
                                onChange={() => {
                                    setMessage("");
                                    setError("");
                                }}
                            />
                            <Submit loading={loading}>Update</Submit>
                        </Form>
                    )}
                </Card.Body>
            </Card>
            <div className={authStyle.link}>
                <Link to="/">Back to Home</Link>
            </div>
        </Dialog>
    );
}
