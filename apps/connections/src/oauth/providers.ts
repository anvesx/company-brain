export type OAuthProvider = {
  /** The account provider id this sign-in creates, matching the brain connector id. */
  source: "github" | "drive";
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  authorizeURL: string;
  tokenURL: string;
  scopes: string[];
  pkce: boolean;
  extraParams: Record<string, string>;
};

type Given = { clientId: string; clientSecret: string; redirectURI: string; authorizeURL?: string; tokenURL?: string };

// The same endpoints arctic's GitHub and Google classes hardcode. They are overridable here so tests can point at a local replay server.
const KNOWN = {
  github: {
    source: "github",
    authorizeURL: "https://github.com/login/oauth/authorize",
    tokenURL: "https://github.com/login/oauth/access_token",
    scopes: ["repo"],
    pkce: false,
    extraParams: {},
  },
  google: {
    source: "drive",
    authorizeURL: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenURL: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    pkce: true,
    extraParams: { access_type: "offline", prompt: "consent" },
  },
} as const;

export const oauthProvider = (name: keyof typeof KNOWN, g: Given): OAuthProvider => {
  const k = KNOWN[name];
  return {
    ...k,
    scopes: [...k.scopes],
    extraParams: { ...k.extraParams },
    clientId: g.clientId,
    clientSecret: g.clientSecret,
    redirectURI: g.redirectURI,
    authorizeURL: g.authorizeURL ?? k.authorizeURL,
    tokenURL: g.tokenURL ?? k.tokenURL,
  };
};
