declare module "*.css" {
  interface IClassNames {
    [className: string]: string;
  }
  const classNames: IClassNames;
  export = classNames;
}

// CRA environment variables — provide global `process` for TS in our app code.
declare var process: {
  env: {
    NODE_ENV: "development" | "production" | "test";
    REACT_APP_BACKEND_URL?: string;
    [key: string]: string | undefined;
  };
};
