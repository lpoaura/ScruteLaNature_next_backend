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

    // ── Tests de sécurité ──────────────────────────────────────────────────────
    console.log('\n[10] TEST SÉCURITÉ — Escalade de rôle bloquée...');
    // Un user normal NE DOIT PAS pouvoir se passer SUPER_ADMIN via PATCH /users/me
    let roleEscalationBlocked = false;
    try {
      await fetchApi('/users/me', 'PATCH', { role: 'SUPER_ADMIN' }, headers);
    } catch (err) {
      if (err.status === 400) {
        roleEscalationBlocked = true;
        console.log('✅ Escalade de rôle bloquée (400 Bad Request reçu)');
      } else {
        console.log('⚠️  Code inattendu:', err.status, err.data);
      }
    }
    if (!roleEscalationBlocked) {
      console.error('❌ FAILLE : Un utilisateur peut changer son propre rôle !');
    }

    console.log('\n[11] TEST SÉCURITÉ — Date ISO invalide rejetée par sync...');
    let invalidDateRejected = false;
    try {
      await fetchApi('/mobile/sync', 'POST', {
        parcoursCompleted: [{
          syncId: 'bbbbbbbb-0000-4000-8000-000000000001',
          parcoursId: parcoursId,
          score: 100,
          completedAt: 'ceci-nest-pas-une-date',
        }]
      }, headers);
    } catch (err) {
      if (err.status === 400) {
        invalidDateRejected = true;
        console.log('✅ Date ISO invalide rejetée (400 Bad Request reçu)');
      }
    }
    if (!invalidDateRejected) {
      console.error('❌ FAILLE : Une date invalide a été acceptée par /mobile/sync !');
    }

    console.log('\n[12] TEST SÉCURITÉ — organismeId non-UUID rejeté...');
    let invalidOrgIdRejected = false;
    try {
      await fetchApi('/admin/users', 'POST', {
        email: 'test-bad@lpo.fr',
        password: 'Test1234!',
        role: 'EDITOR',
        organismeId: 'pas-un-uuid',
      }, headers);
    } catch (err) {
      if (err.status === 400) {
        invalidOrgIdRejected = true;
        console.log('✅ organismeId non-UUID rejeté (400 Bad Request reçu)');
      }
    }
    if (!invalidOrgIdRejected) {
      console.error('❌ FAILLE : Un organismeId invalide a été accepté !');
    }

    // ── Tests Système d'Amis (Tâche 4.2) ──────────────────────────────────────
    console.log('\n--- Tests Système d\'Amis (Tâche 4.2) ---');

    // Créer un 2ème utilisateur (le "ami") via inscription normale
    // On utilise le compte SUPER_ADMIN pour créer un joueur via /admin/users
    console.log('\n[13] Création d\'un joueur de test...');
    const playerEmail = `player-${Date.now()}@test.fr`;
    await fetchApi('/admin/users', 'POST', {
      email: playerEmail,
      password: 'Player123!',
      role: 'USER',
    }, headers);
    console.log('✅ Joueur créé:', playerEmail);

    // Le SUPER_ADMIN ne peut pas s'envoyer une demande à lui-même
    // (car il n'a pas de pseudo), on teste le reject en cherchant un pseudo inexistant
    console.log('\n[14] Envoi demande à pseudo inexistant (doit échouer)...');
    try {
      await fetchApi('/social/friends/request', 'POST', { pseudo: 'PseudoQUINExistePas' }, headers);
      console.error('❌ Aurait dû échouer !');
    } catch (err) {
      if (err.status === 404) {
        console.log('✅ 404 retourné pour pseudo inconnu');
      }
    }

    // Vérifier que la liste des demandes est vide au départ
    console.log('\n[15] Liste des demandes reçues (doit être vide)...');
    const pendingBefore = await fetchApi('/social/friends/requests', 'GET', null, headers);
    console.log('✅ Demandes en attente:', pendingBefore.length);

    // Vérifier que la liste d\'amis est vide au départ
    console.log('\n[16] Liste des amis (doit être vide)...');
    const friendsBefore = await fetchApi('/social/friends', 'GET', null, headers);
    console.log('✅ Amis actuels:', friendsBefore.length);

    // ── Tests Avis & Notes (Tâche 4.3) ────────────────────────────────────────
    console.log('\n--- Tests Avis & Notes (Tâche 4.3) ---');

    console.log('\n[17] Laisser un avis sur le parcours...');
    const reviewData = await fetchApi('/social/reviews', 'POST', {
      parcoursId: parcoursId,
      rating: 5,
      comment: 'Superbe balade, les jeux sont vraiment fun !',
    }, headers);
    console.log('✅ Avis créé. Note:', reviewData.rating, '/ ID:', reviewData.id);
    const reviewId = reviewData.id;

    console.log('\n[18] Tentative de doublon (même parcours) — doit échouer...');
    try {
      await fetchApi('/social/reviews', 'POST', {
        parcoursId: parcoursId,
        rating: 3,
        comment: 'Deuxième avis',
      }, headers);
      console.error('❌ Le doublon aurait dû être rejeté !');
    } catch (err) {
      if (err.status === 409) {
        console.log('✅ Doublon rejeté (409 Conflict)');
      }
    }

    console.log('\n[19] Récupérer les avis avec note moyenne...');
    const reviewsData = await fetchApi(`/social/reviews/parcours/${parcoursId}`, 'GET', null, headers);
    console.log('✅ Note moyenne:', reviewsData.averageRating, '/ Total avis:', reviewsData.totalReviews);

    console.log('\n[20] Supprimer l\'avis (modération admin)...');
    const deleteReview = await fetchApi(`/social/reviews/${reviewId}`, 'DELETE', null, headers);
    console.log('✅', deleteReview.message);

    console.log('\n--- TOUS LES TESTS SONT PASSES AVEC SUCCES 🚀 ---');

  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS:');
    if (error.status) {
      console.error('Status:', error.status);
      console.error('Data:', JSON.stringify(error.data, null, 2));
    } else {
      console.error(error);
    }
  }
}

runTests();
