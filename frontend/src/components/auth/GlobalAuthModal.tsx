import React from "react";
import AuthModal from "./AuthModal";
import { useAuthModal } from "../../context/AuthModalContext";

/* Global single instance — відкривається через useAuthModal().openAuth() */
const GlobalAuthModal: React.FC = () => {
  const { open, tab, closeAuth } = useAuthModal();
  return <AuthModal open={open} onClose={closeAuth} initialTab={tab} />;
};

export default GlobalAuthModal;
