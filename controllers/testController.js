export async function testEndpoint(req, res) {
    res.render('test', { title: 'Test Seite', descripton: 'Dies ist eine Testseite.' });
}