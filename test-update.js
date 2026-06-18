const http = require('http');

const data = JSON.stringify({
  title: "coco jones",
  difficulty: "FACILE",
  distanceKm: 0.1,
  durationMin: 30,
  zonageId: "649c7280-8390-422d-997f-05d14fd01bae",
  status: "DRAFT",
  coverImage: "http://localhost:3000/uploads/images/eco-geste-icone-db56bdd1.png",
  isPMRFriendly: false,
  isChildFriendly: true,
  isMentalHandicapFriendly: false,
  badge: {
    name: "kkk",
    imageUrl: "http://localhost:3000/uploads/images/compter-image-icone-a476aed0.png"
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/admin/parcours/56a46fe6-fa86-4828-bbd1-ebf4af5b2c27',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});

req.on('error', (error) => console.error(error));
req.write(data);
req.end();
