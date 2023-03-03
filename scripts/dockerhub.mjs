let jwt = null;

export async function API(method, path, body, auth = {}) {
    const authHeader = "username" in auth && "token" in auth
        ? { "Authorization": `JWT ${(await Login(auth.username, auth.token))}` }
        : {};
    
    return fetch(new URL(path, "https://hub.docker.com/v2/").href, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...authHeader
        },
        body: JSON.stringify(body)
    });
}

export async function Login(username, password) {
    if (jwt) return jwt;
    
console.log(`logging in with ${username} and ${password}`)

    const response = await API("POST", "users/login/", {
        "username": username,
        "password": password
    });

    switch (response.status) {
        case 200:
            jwt = (await response.json()).token;
            return jwt;
        default:
            const body = await response.text();
            throw new Error(`${response.status}: ${JSON.stringify(response)}`);
    }
}
