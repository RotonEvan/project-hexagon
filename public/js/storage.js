import { Web3Storage } from '../../node_modules/web3.storage/dist/bundle.esm.min.js'


// function makeStorageClient() {
//     return new Web3Storage({ token: getAccessToken() })
// }

// const client = new Web3Storage({ token: getAccessToken() });

function getAccessToken() {
    // If you're just testing, you can paste in a token
    // and uncomment the following line:
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDIxMjEwMTk0QzFlNzQ3ODgxRTNDZTE3RjUyRjE4MDc5QzU2MGMxYWMiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NDA0NjYzMzc3NDEsIm5hbWUiOiJIZXhhZ29uIn0.UxqjXMQQ2Iu6xEaJJR_8oiPwlCFz23CJtVxlbtVWI5I'

    // In a real app, it's better to read an access token from an 
    // environement variable or other configuration that's kept outside of 
    // your code base. For this to work, you need to set the
    // WEB3STORAGE_TOKEN environment variable before you run your code.
    //   return process.env.WEB3STORAGE_TOKEN
}

export const client = new Web3Storage({ token: getAccessToken() });