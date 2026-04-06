const http = require('http');

http.get('http://localhost:8081/', (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Body length:', data.length);
        console.log('Body start:', data.substring(0, 200));
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
