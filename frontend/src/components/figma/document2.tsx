import React from "react";
import Navbar1 from "./navbar1";
import styles from "./document2.module.css";

export type Document2Type = {
  className?: string;
};

const Document2: React.FC<Document2Type> = ({ className = "" }) => {
  return (
    <section className={[styles.document, className].join(" ")}>
      <Navbar1
        device="Desktop"
        state="Default"
        size="20"
        size1="20"
        size2="24"
      />
    </section>
  );
};

export default Document2;
