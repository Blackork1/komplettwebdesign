# Node.js-Version und Webhook-Deployment

Website und Content-Worker verwenden dasselbe Docker-Image. Die Node.js-Version wird im `Dockerfile`, in `.nvmrc` und in den `engines`-Angaben von `package.json` und `package-lock.json` festgelegt. Der Image-Build führt `scripts/verifyNodeVersion.js` aus und bricht bei einer abweichenden oder fehlenden Versionsvorgabe ab.

Das reguläre Deployment liegt auf dem VPS unter `/home/webadmin/apps/komplettwebdesign/deploy/deploy.sh`. Es aktualisiert nur einen sauberen Git-Checkout per Fast-Forward, lädt das Basisimage beim Build erneut und prüft die Node-Version vor den Datenbankmigrationen sowie nach dem Neustart von App und Content-Worker.

Der Webhook hat ein eigenes Image. Sein Dockerfile liegt außerhalb des Git-Checkouts unter `/home/webadmin/apps/komplettwebdesign/deploy/webhook/Dockerfile` und wird auf dem VPS gesondert gepflegt. Es verwendet dieselbe Node.js-Version wie die Website. Ein gewöhnliches Website-Deployment baut das Webhook-Image nicht neu.

Bei einer späteren Node-Aktualisierung müssen deshalb die Versionsdatei, beide Paketdateien, das Website-Dockerfile und das Webhook-Dockerfile gemeinsam angepasst und überprüft werden. Anschließend werden Website und Worker sowie der Webhook mit ihren jeweiligen Images neu gebaut und ihre tatsächlich laufenden Versionen kontrolliert.
