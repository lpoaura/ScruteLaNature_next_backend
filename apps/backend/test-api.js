const API_URL = 'http://localhost:3000/api';
let token = '';
let organismeId = '';
let zonageId = '';
let parcoursId = '';
let etapeId = '';
let jeuId = '';

async function fetchApi(path, method = 'GET', body = null, headers = {}) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function runTests() {
  try {
    console.log('--- DEBUT DES TESTS API ---');

    console.log('\n[1] Login as Super Admin...');
    const loginData = await fetchApi('/auth/login', 'POST', {
      email: 'superadmin@lpo.fr',
      password: 'LpoAdmin123!'
    });
    token = loginData.access_token;
    console.log('✅ Login réussi. Token obtenu.');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n[2] Création/Récupération Organisme...');
    let organismesData = await fetchApi('/admin/organismes', 'GET', null, headers);
    if (organismesData.length === 0) {
      const createOrgData = await fetchApi('/admin/organismes', 'POST', { nom: 'LPO Auvergne-Rhône-Alpes' }, headers);
      organismeId = createOrgData.id;
      console.log('✅ Organisme créé:', createOrgData.nom);
    } else {
      organismeId = organismesData[0].id;
      console.log('✅ Organisme existant:', organismesData[0].nom);
    }

    console.log('\n[3] Création/Récupération Zonage...');
    let zonagesData = await fetchApi('/admin/zonages', 'GET', null, headers);
    if (zonagesData.length === 0) {
      const createComData = await fetchApi('/admin/zonages', 'POST', { nom: 'Lyon', codePostal: '69000' }, headers);
      zonageId = createComData.id;
      console.log('✅ Zonage créée:', createComData.nom);
    } else {
      zonageId = zonagesData[0].id;
      console.log('✅ Zonage existante:', zonagesData[0].nom);
    }

    console.log('\n[4] Création d\'un Parcours...');
    const createParcData = await fetchApi(`/admin/parcours?organismeId=${organismeId}`, 'POST', {
      title: 'Balade test API',
      description: 'Test du flux complet',
      difficulty: 'FACILE',
      distanceKm: 2.5,
      durationMin: 45,
      coverImage: 'test-cover.jpg',
      zonageId: zonageId
    }, headers);
    parcoursId = createParcData.id;
    console.log('✅ Parcours créé avec succès. ID:', parcoursId);

    await fetchApi(`/admin/parcours/${parcoursId}`, 'PATCH', { status: 'PUBLISHED' }, headers);
    console.log('✅ Parcours publié.');

    console.log('\n[5] Création d\'une Étape...');
    const createEtapeData = await fetchApi('/admin/etapes', 'POST', {
      parcoursId: parcoursId,
      order: 1,
      title: 'Départ près de la rivière',
      latitude: 45.764043,
      longitude: 4.835659,
      description: 'Ici on peut voir des canards.'
    }, headers);
    etapeId = createEtapeData.id;
    console.log('✅ Étape créée avec succès. ID:', etapeId);

    console.log('\n[6] Création d\'un Jeu...');
    const createJeuData = await fetchApi('/admin/jeux', 'POST', {
      etapeId: etapeId,
      type: 'QCM',
      order: 1,
      question: 'Quel est cet oiseau ?',
      donneesJeu: {
        choices: ['Un canard', 'Une poule', 'Un pigeon'],
        correctAnswer: 'Un canard'
      }
    }, headers);
    jeuId = createJeuData.id;
    console.log('✅ Jeu créé avec succès. ID:', jeuId);

    console.log('\n[7] Test API Mobile - Download Parcours...');
    const downloadData = await fetchApi(`/mobile/parcours/${parcoursId}/download`, 'GET', null, headers);
    console.log('✅ Parcours récupéré. Nombre d\'étapes:', downloadData.etapes.length);
    console.log('✅ Nombre de jeux dans la 1ère étape:', downloadData.etapes[0].jeux.length);

    console.log('\n[8] Test API Mobile - Nearby...');
    const nearbyData = await fetchApi('/mobile/parcours/nearby?latitude=45.764&longitude=4.835&radiusKm=10', 'GET', null, headers);
    console.log('✅ Parcours proches trouvés:', nearbyData.length);
    if (nearbyData.length > 0) {
      console.log('✅ Distance du premier parcours:', nearbyData[0].distanceFromUserKm, 'km');
    }

    console.log('\n[9] Test API Mobile - Sync hors-ligne (T\u00e2che 4.1)...');
    const fakeSyncId1 = 'aaaaaaaa-0000-4000-8000-000000000001';
    const fakeSyncId2 = 'aaaaaaaa-0000-4000-8000-000000000002';
    const syncPayload = {
      parcoursCompleted: [
        {
          syncId: fakeSyncId1,
          parcoursId: parcoursId,
          score: 850,
          completedAt: new Date().toISOString(),
          co2Saved: 1.2,
        }
      ],
      observations: [
        {
          syncId: fakeSyncId2,
          speciesName: 'Canard colvert',
          imageUrl: 'test-oiseau.jpg',
          latitude: 45.764043,
          longitude: 4.835659,
          aiConfidence: 0.92,
          timestamp: new Date().toISOString(),
        }
      ]
    };

    const syncResult = await fetchApi('/mobile/sync', 'POST', syncPayload, headers);
    console.log('✅ Sync 1ère fois - Parcours synced:', syncResult.results.parcoursCompleted.synced);
    console.log('✅ Sync 1ère fois - Observations synced:', syncResult.results.observations.synced);

    // Test idempotence : renvoyer les m\u00eames syncIds -> doit \u00eatre skipp\u00e9
    const syncResult2 = await fetchApi('/mobile/sync', 'POST', syncPayload, headers);
    console.log('✅ Sync 2\u00e8me fois (idempotence) - Parcours skipped:', syncResult2.results.parcoursCompleted.skipped);
    console.log('✅ Sync 2\u00e8me fois (idempotence) - Observations skipped:', syncResult2.results.observations.skipped);

    console.log('\n--- TOUS LES TESTS SONT PASSES AVEC SUCCES 🚀 ---');

  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS:');
    if (error.status) {
      console.error('Status:', error.status);
      console.error('Data:', error.data);
    } else {
      console.error(error);
    }
  }
}

runTests();
