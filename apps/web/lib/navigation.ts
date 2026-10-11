/**
 * A full page load to `path`. Use it after anything that changes the session
 * (log-in, verification, log-out, the first-run step): a client-side push would
 * keep the router cache and the hidden Activity routes rendered for the old
 * session.
 */
export function hardNavigate(path: string) {
    window.location.assign(path);
}
