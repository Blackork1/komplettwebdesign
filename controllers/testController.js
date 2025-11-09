export async function testEndpoint(req, res) {
    res.render('test', { title: 'Test Seite', description: 'Dies ist eine Testseite.' });
}