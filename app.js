// ========= 1. Inizializzazione di Supabase =========
const SUPABASE_URL = 'https://djikypgmchywybjxbwar.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqaWt5cGdtY2h5d3lianhid2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTMyOTIsImV4cCI6MjA2ODc4OTI5Mn0.dXqWkg47xTg2YtfLhBLrFd5AIB838KdsmR9qsMPkk8Q';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========= 2. Esegui il resto del codice quando la pagina è pronta =========
document.addEventListener('DOMContentLoaded', () => {
    // --- Variabile di stato globale per le poesie ---
    let allPoems = [];

    // --- SELEZIONE DI TUTTI GLI ELEMENTI HTML ---
    const poemsListContainer = document.querySelector('.poems-list');
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const googleLoginBtn = document.getElementById('login-google-btn');
    const submissionModal = document.getElementById('submission-modal');
    const openSubmissionModalBtn = document.getElementById('open-submission-modal-btn');
    const closeSubmissionModalBtn = document.getElementById('close-submission-modal-btn');
    const submissionForm = document.getElementById('submission-form');
    const anonymousCheckbox = document.getElementById('anonymous-checkbox');
    const firstNameInput = document.getElementById('author-firstname');
    const lastNameInput = document.getElementById('author-lastname');
    const instagramInput = document.getElementById('author-instagram');
    const formMessage = document.getElementById('form-message');
    const votingModal = document.getElementById('voting-modal');
    const closeVotingModalBtn = document.getElementById('close-voting-modal-btn');
    const starRatingContainer = document.querySelector('#voting-modal .star-rating');
    const submitVoteBtn = document.getElementById('submit-vote-btn');
    const votePoemIdInput = document.getElementById('vote-poem-id');
    const voteMessage = document.getElementById('vote-form-message');
    const howToModal = document.getElementById('how-to-modal');
    const aboutUsModal = document.getElementById('about-us-modal');
	const authorModal = document.getElementById('author-modal');
const authorLink = document.getElementById('author-link');
const closeAuthorModalBtn = document.getElementById('close-author-modal-btn');
const authorExternalLink = document.getElementById('author-external-link'); // link cliccabile
    const howToLink = document.getElementById('how-to-link');
    const aboutUsLink = document.getElementById('about-us-link');
    const closeHowToModalBtn = document.getElementById('close-how-to-modal-btn');
    const closeAboutUsModalBtn = document.getElementById('close-about-us-modal-btn');
    const howToSubmitBtn = document.getElementById('how-to-submit-btn');
    const sidebarParticipateBtn = document.getElementById('sidebar-participate-btn');
    const searchInput = document.getElementById('search-poems');
    const sortBySelect = document.getElementById('sort-by');
    const monthlyPoemsListContainer = document.getElementById('monthly-poems-list');
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const discoverMoreTrigger = document.getElementById('discover-more-trigger');
    const expandedContent = document.getElementById('expanded-content');
	// AGGIUNGI QUESTA RIGA:
const shareInstagramBtn = document.getElementById('share-cta-btn');
						

    // =======================================================
    // INIZIALIZZAZIONE
    // =======================================================
	
	// =======================================================
// CONDIVISIONE INSTAGRAM
// =======================================================
if (shareInstagramBtn) {
    shareInstagramBtn.addEventListener('click', async function() {
        const shareData = {
            title: 'TheItalianPoetry',
            text: 'Scopri la community di scrittura creativa! ✍️📖 #Poesia #ScritturaCreativa',
            url: window.location.href
        };

        try {
            // Prima prova con la Web Share API (mobile)
            if (navigator.share) {
                await navigator.share(shareData);
            } 
            // Fallback per Instagram diretto su mobile
            else if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                window.location.href = `instagram://library?AssetPath=${encodeURIComponent(shareData.url)}`;
            }
            // Fallback per desktop
            else {
                showInstagramShareFallback();
            }
        } catch (err) {
            console.log('Errore condivisione:', err);
            showInstagramShareFallback();
        }
    });

    function showInstagramShareFallback() {
        const shareFallback = document.getElementById('share-fallback');
        if (!shareFallback) return;
        
        shareFallback.classList.remove('hidden');
        const shareInput = document.getElementById('poem-share-link');
        if (shareInput) shareInput.value = window.location.href;
        
        // Copia automatica
        navigator.clipboard.writeText(window.location.href).then(() => {
            const originalText = shareInstagramBtn.innerHTML;
            shareInstagramBtn.innerHTML = '<i class="fas fa-check"></i> Link copiato!';
            setTimeout(() => {
                shareInstagramBtn.innerHTML = originalText;
            }, 2000);
        });
    }
}
	
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        caricaDatiIniziali();
    });

    // =======================================================
    // GESTIONE AUTENTICAZIONE
    // =======================================================
    async function signInWith(provider) { 
        await supabaseClient.auth.signInWithOAuth({ 
            provider, 
            options: { redirectTo: window.location.origin } 
        }); 
    }

    async function signOut() { 
        await supabaseClient.auth.signOut(); 
    }

    if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => signInWith('google'));
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);

    supabaseClient.auth.onAuthStateChange((event, session) => {
        const loggedIn = !!session;
        authButtons.classList.toggle('hidden', loggedIn);
        userInfo.classList.toggle('hidden', !loggedIn);
        
        if (loggedIn) {
            userEmailSpan.textContent = session.user.email;
            openSubmissionModalBtn.disabled = false;
        } else {
            userEmailSpan.textContent = '';
            openSubmissionModalBtn.disabled = true;
        }
    });

    // =======================================================
    // GESTIONE MENU MOBILE
    // =======================================================
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', () => {
            const navWrapper = document.querySelector('.nav-wrapper');
            const isExpanded = mobileNavToggle.getAttribute('aria-expanded') === 'true';
            
            mobileNavToggle.setAttribute('aria-expanded', !isExpanded);
            navWrapper.setAttribute('data-visible', !isExpanded);
            
            // Cambia icona
            const icon = mobileNavToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // =======================================================
    // GESTIONE "SCOPRI DI PIÙ"
    // =======================================================
    if (discoverMoreTrigger && expandedContent) {
        discoverMoreTrigger.addEventListener('click', () => {
            expandedContent.classList.toggle('hidden-content');
            expandedContent.classList.toggle('slide-down');
            
            // Ruota la freccia
            const arrow = discoverMoreTrigger.querySelector('.arrow-down');
            arrow.style.transform = expandedContent.classList.contains('hidden-content') ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }

    // =======================================================
    // GESTIONE MODALI
    // =======================================================
    const setupModal = (modal, openTriggers, closeTriggers) => {
        if (!modal) return;
        openTriggers.forEach(trigger => {
            if (trigger) trigger.addEventListener('click', (e) => { 
                e.preventDefault(); 
                modal.classList.remove('hidden');
                modal.setAttribute('aria-modal', 'true');
            });
        });
        closeTriggers.forEach(trigger => {
            if (trigger) trigger.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.removeAttribute('aria-modal');
                if (modal === votingModal) { 
                    resetVotingModal(); 
                } 
            });
        });
        modal.addEventListener('click', (e) => { 
            if (e.target === modal) { 
                modal.classList.add('hidden');
                modal.removeAttribute('aria-modal');
                if (modal === votingModal) { 
                    resetVotingModal(); 
                } 
            } 
        });
    };

    setupModal(submissionModal, [openSubmissionModalBtn], [closeSubmissionModalBtn]);
    setupModal(votingModal, [], [closeVotingModalBtn]);
    setupModal(howToModal, [howToLink, sidebarParticipateBtn], [closeHowToModalBtn]);
    setupModal(aboutUsModal, [aboutUsLink], [closeAboutUsModalBtn]);
	setupModal(authorModal, [authorLink], [closeAuthorModalBtn]);
	
	
    if (howToSubmitBtn) {
        howToSubmitBtn.addEventListener('click', async () => {
            howToModal.classList.add('hidden');
            howToModal.removeAttribute('aria-modal');
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                submissionModal.classList.remove('hidden');
                submissionModal.setAttribute('aria-modal', 'true');
            } else {
                alert("Per favore, accedi con Google prima di inviare una poesia.");
            }
        });
    }

    // =======================================================
    // LOGICA FORM INVIO POESIA
    // =======================================================
    if (anonymousCheckbox) {
        const toggleAnonymousFields = () => {
            const isChecked = anonymousCheckbox.checked;
            [firstNameInput, lastNameInput, instagramInput].forEach(input => {
                input.disabled = isChecked;
                if (isChecked) input.value = '';
            });
        };
        
        anonymousCheckbox.addEventListener('change', toggleAnonymousFields);
        // Imposta stato iniziale
        toggleAnonymousFields();
    }

    if (submissionForm) {
        submissionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) { 
                formMessage.textContent = "Devi effettuare l'accesso per poter inviare una poesia!";
                formMessage.style.color = 'red';
                return; 
            }

            const user = session.user;
            const title = document.getElementById('poem-title').value;
            const content = document.getElementById('poem-content').value;
            const isAnonymous = anonymousCheckbox.checked;
            const author_name = isAnonymous ? 'Anonimo' : `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`.trim();
            const instagram_handle = instagramInput.value.trim();

            if (!title || !content || (!isAnonymous && !author_name)) {
                formMessage.textContent = 'Per favore, compila tutti i campi richiesti.';
                formMessage.style.color = 'red';
                return;
            }

            formMessage.textContent = 'Invio in corso...';
            formMessage.style.color = 'inherit';
            
            try {
                const { error: insertError } = await supabaseClient.from('poesie').insert([{ 
                    title, 
                    content, 
                    author_name, 
                    profile_id: user.id,
                    instagram_handle: isAnonymous ? null : instagram_handle || null
                }]);

                if (insertError) {
                    throw insertError;
                }

                if (!isAnonymous) {
                    await supabaseClient.from('profiles').upsert({ 
                        id: user.id, 
                        username: author_name, 
                        instagram_handle: instagram_handle || null 
                    });
                }

                formMessage.textContent = 'Grazie! La tua poesia è stata inviata con successo!';
                formMessage.style.color = 'green';
                submissionForm.reset();
                
                await caricaDatiIniziali();
                setTimeout(() => {
                    submissionModal.classList.add('hidden');
                    submissionModal.removeAttribute('aria-modal');
                    formMessage.textContent = '';
                }, 3000);
            } catch (error) {
                formMessage.textContent = `Errore: ${error.message}`;
                formMessage.style.color = 'red';
                console.error('Errore durante l\'invio:', error);
            }
        });
    }
    
    // =======================================================
    // LOGICA VOTAZIONE
    // =======================================================
    let currentRating = 0;
    
    function resetVotingModal() {
        voteMessage.textContent = '';
        voteMessage.style.color = '';
        votePoemIdInput.value = '';
        resetStars();
    }
    
    if (closeVotingModalBtn) {
        closeVotingModalBtn.addEventListener('click', resetVotingModal);
    }

    async function apriModaleVoto(poemId) {
        if (!poemId) return;
        
        // Controlla se l'utente ha già votato
        if (document.cookie.includes(`voted-poem-${poemId}=true`)) {
            alert("Hai già votato questa poesia. Grazie!");
            return;
        }
        
        try {
            const { data: poem, error } = await supabaseClient.from('poesie').select('*').eq('id', poemId).single();
            
            if (error) throw error;
            
            if (poem) {
                document.getElementById('vote-poem-title').textContent = poem.title;
                document.getElementById('vote-poem-author').textContent = `di ${poem.author_name}`;
                document.getElementById('vote-poem-content').textContent = poem.content;
                votePoemIdInput.value = poem.id;
                resetStars();
                votingModal.classList.remove('hidden');
                votingModal.setAttribute('aria-modal', 'true');
            }
        } catch (error) {
            console.error('Errore nel caricamento della poesia:', error);
            alert("Si è verificato un errore nel caricamento della poesia. Riprova più tardi.");
        }
    }

    function showPoemDetail(poem) {
        const overlay = document.createElement('div');
        overlay.className = 'poem-detail-overlay';
        
        const detailBox = document.createElement('div');
        detailBox.className = 'poem-detail-box';
        
        detailBox.innerHTML = `
            <button class="close-poem-detail" aria-label="Chiudi">&times;</button>
            <div class="poem-detail-content">
                <h2>${poem.title}</h2>
                <p class="poem-author">di ${poem.author_name}</p>
                <div class="poem-text">${poem.content.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="voting-area">
                <h3>Il tuo voto:</h3>
                <div class="star-rating" role="radiogroup" aria-label="Valuta questa poesia con le stelle">
                    <input type="radio" id="detail-star1" name="detail-rating" value="1" class="sr-only">
                    <label for="detail-star1" class="star" aria-label="1 stella"><i class="fa-regular fa-star"></i></label>
                    <input type="radio" id="detail-star2" name="detail-rating" value="2" class="sr-only">
                    <label for="detail-star2" class="star" aria-label="2 stelle"><i class="fa-regular fa-star"></i></label>
                    <input type="radio" id="detail-star3" name="detail-rating" value="3" class="sr-only">
                    <label for="detail-star3" class="star" aria-label="3 stelle"><i class="fa-regular fa-star"></i></label>
                    <input type="radio" id="detail-star4" name="detail-rating" value="4" class="sr-only">
                    <label for="detail-star4" class="star" aria-label="4 stelle"><i class="fa-regular fa-star"></i></label>
                    <input type="radio" id="detail-star5" name="detail-rating" value="5" class="sr-only">
                    <label for="detail-star5" class="star" aria-label="5 stelle"><i class="fa-regular fa-star"></i></label>
                </div>
                <input type="hidden" id="detail-poem-id" value="${poem.id}">
                <button id="detail-submit-vote-btn" class="button-primary">Invia Voto</button>
                <p id="detail-vote-message" role="status" aria-live="polite"></p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(detailBox);
        
        // Gestione chiusura
        const closeBtn = detailBox.querySelector('.close-poem-detail');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(detailBox);
        });
        
        // Gestione votazione nella detail box
        setupStarRating(detailBox, poem.id);
    }

    function setupStarRating(container, poemId) {
        let currentRating = 0;
        const stars = container.querySelectorAll('.star-rating label.star');
        const submitBtn = container.querySelector('#detail-submit-vote-btn');
        const messageEl = container.querySelector('#detail-vote-message');
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                currentRating = parseInt(star.getAttribute('for').replace('detail-star', ''), 10);
                highlightStars(container, currentRating);
            });
        });
        
        submitBtn.addEventListener('click', async () => {
            if (currentRating === 0) {
                messageEl.textContent = 'Per favore, seleziona da 1 a 5 stelle.';
                messageEl.style.color = 'red';
                return;
            }
            
            messageEl.textContent = 'Invio in corso...';
            messageEl.style.color = 'inherit';
            
            try {
                const { data, error } = await supabaseClient.functions.invoke('invia-voto', {
                    body: { 
                        poemId: poemId,
                        rating: currentRating
                    }
                });
                
                if (error) throw error;
                
                messageEl.textContent = 'Grazie per aver votato!';
                messageEl.style.color = 'green';
                
                // Aggiorna la classifica
                await caricaDatiIniziali();
                
                setTimeout(() => {
                    const overlay = document.querySelector('.poem-detail-overlay');
                    const detailBox = document.querySelector('.poem-detail-box');
                    if (overlay) document.body.removeChild(overlay);
                    if (detailBox) document.body.removeChild(detailBox);
                }, 2000);
            } catch (error) {
                console.error('Errore durante la votazione:', error);
                messageEl.textContent = 'Si è verificato un errore durante la votazione. Riprova.';
                messageEl.style.color = 'red';
            }
        });
    }

    function highlightStars(container, rating) {
        container.querySelectorAll('.star-rating label.star i').forEach((icon, index) => {
            if (index < rating) {
                icon.classList.add('fa-solid', 'selected');
                icon.classList.remove('fa-regular');
            } else {
                icon.classList.remove('fa-solid', 'selected');
                icon.classList.add('fa-regular');
            }
        });
    }

    if (poemsListContainer) {
        poemsListContainer.addEventListener('click', (event) => {
            const voteButton = event.target.closest('.button-vote');
            if (voteButton) {
                const poemId = voteButton.dataset.poemId;
                apriModaleVoto(poemId);
            }
        });
    }

    if (monthlyPoemsListContainer) {
        monthlyPoemsListContainer.addEventListener('click', (event) => {
            const miniPoemItem = event.target.closest('.mini-poem-item');
            if (miniPoemItem) {
                const poemId = miniPoemItem.dataset.poemId;
                apriModaleVoto(poemId);
            }
        });
    }
    
    function resetStars() {
        currentRating = 0;
        starRatingContainer.querySelectorAll('label.star i').forEach(icon => {
            icon.classList.remove('selected', 'fa-solid');
            icon.classList.add('fa-regular');
        });
        const checkedRadio = starRatingContainer.querySelector('input[type="radio"]:checked');
        if (checkedRadio) checkedRadio.checked = false;
    }

    if (submitVoteBtn) {
        submitVoteBtn.addEventListener('click', async () => {
            if (currentRating === 0 || currentRating > 5) {
                voteMessage.textContent = 'Per favore, seleziona da 1 a 5 stelle.';
                voteMessage.style.color = 'red';
                return;
            }

            const poemId = parseInt(votePoemIdInput.value, 10);
            const rating = currentRating;

            if (isNaN(poemId)) {
                voteMessage.textContent = 'Errore: ID della poesia non valido.';
                voteMessage.style.color = 'red';
                return;
            }
            
            voteMessage.textContent = 'Invio in corso...';
            voteMessage.style.color = 'inherit';

            try {
                const { data, error } = await supabaseClient.functions.invoke('invia-voto', {
                    body: { 
                        poemId: poemId,
                        rating: rating
                    }
                });

                if (error) {
                    if (error.context && error.context.status === 409) {
                        const errorData = await error.context.json();
                        voteMessage.textContent = errorData.error;
                    } else {
                        console.error("Dettaglio errore da Supabase:", error);
                        voteMessage.textContent = 'Si è verificato un errore imprevisto.';
                    }
                    voteMessage.style.color = 'red';
                    return;
                }

                voteMessage.textContent = 'Grazie per aver votato!';
                voteMessage.style.color = 'green';
                
                // Imposta un cookie per ricordare che l'utente ha già votato
                document.cookie = `voted-poem-${poemId}=true; max-age=31536000; path=/`;
                await caricaDatiIniziali(); 
                
                setTimeout(() => {
                    votingModal.classList.add('hidden');
                    votingModal.removeAttribute('aria-modal');
                    resetVotingModal();
                }, 2000);
            } catch (error) {
                console.error('Errore durante la votazione:', error);
                voteMessage.textContent = 'Si è verificato un errore durante la votazione. Riprova.';
                voteMessage.style.color = 'red';
            }
        });
    }

    // =======================================================
    // FUNZIONE DI RENDER E CARICAMENTO POESIE
    // =======================================================
    function renderPoems() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredPoems = allPoems.filter(poesia => 
        poesia.title.toLowerCase().includes(searchTerm) || 
        poesia.author_name.toLowerCase().includes(searchTerm)
    );

    const now = new Date();
    const currentMonthUTC = now.getUTCMonth();
    const currentYearUTC = now.getUTCFullYear();
    let monthlyPoems = filteredPoems.filter(poesia => {
        const poemDate = new Date(poesia.created_at);
        return poemDate.getUTCMonth() === currentMonthUTC && poemDate.getUTCFullYear() === currentYearUTC;
    });

    const sortBy = sortBySelect.value;
    monthlyPoems.sort((a, b) => {
        switch (sortBy) {
            case 'popular': return (b.vote_count || 0) - (a.vote_count || 0);
            case 'title-asc': return a.title.localeCompare(b.title);
            case 'title-desc': return b.title.localeCompare(a.title);
            default: return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    const topTenPoems = [...allPoems].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 10);

    if (poemsListContainer) {
        if (topTenPoems.length === 0) {
            poemsListContainer.innerHTML = '<p>Non ci sono ancora poesie. Sii il primo a partecipare!</p>';
        } else {
            poemsListContainer.innerHTML = topTenPoems.map((poesia, index) => {
                const rankEmoji = index === 0 ? '🥇' :
                                  index === 1 ? '🥈' :
                                  index === 2 ? '🥉' : '';

                const rankGlowClass = index < 3 ? 'glow-rank' : '';

                const instagramIcon = poesia.instagram_handle ? 
                    `<a href="https://www.instagram.com/${poesia.instagram_handle}" target="_blank" class="social-icon" aria-label="Instagram"><i class="fab fa-instagram"></i></a>` : '';

                return `
                    <article class="poem-row" data-poem-id="${poesia.id}">
					<div class="poem-info ${rankGlowClass}" data-poem-id="${poesia.id}">
    <span class="poem-rank">${rankEmoji}</span>
    <span class="poem-title">${poesia.title}</span>
    <span class="poem-author golden-author">di ${poesia.author_name}</span>
</div>
                        <div class="poem-actions">
                            ${instagramIcon}
                            <span class="poem-votes">${poesia.vote_count || 0} Voti</span>
                            <button class="button-vote" data-poem-id="${poesia.id}">Vota</button>
                        </div>
                    </article>`;
            }).join('');

            // Aggiungi click per aprire dettaglio
            poemsListContainer.querySelectorAll('.poem-info').forEach(el => {
                el.addEventListener('click', async (e) => {
                    const poemId = el.dataset.poemId;
                    const poem = allPoems.find(p => p.id == poemId);
                    if (poem) showPoemDetail(poem);
                });
            });
        }
    }

    if (monthlyPoemsListContainer) {
        if (monthlyPoems.length === 0) {
            monthlyPoemsListContainer.innerHTML = '<p style="font-size: 0.9rem; color: #777;">Nessuna poesia per questo mese.</p>';
        } else {
            monthlyPoemsListContainer.innerHTML = monthlyPoems.map(poesia => {
                const poemDate = new Date(poesia.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
                return `
                    <div class="mini-poem-item" data-poem-id="${poesia.id}">
                        <span class="mini-poem-title">${poesia.title}</span>
                        <span class="mini-poem-author">di ${poesia.author_name}</span>
                        <span class="mini-poem-date">${poemDate}</span>
                    </div>`;
            }).join('');
        }
    }
}

    async function caricaDatiIniziali() {
        if (poemsListContainer) poemsListContainer.innerHTML = '<p>Caricamento...</p>';
        if (monthlyPoemsListContainer) monthlyPoemsListContainer.innerHTML = '<p>Caricamento...</p>';
        
        try {
            const { data, error } = await supabaseClient.rpc('get_poems_with_votes');
            
            if (error) throw error;
            
            allPoems = data;
            renderPoems();
        } catch (error) {
            console.error('Errore nel caricamento delle poesie:', error);
            if (poemsListContainer) poemsListContainer.innerHTML = '<p>Errore nel caricamento delle poesie. Riprova più tardi.</p>';
            if (monthlyPoemsListContainer) monthlyPoemsListContainer.innerHTML = '<p>Errore nel caricamento delle poesie.</p>';
        }
    }
    
    if(searchInput) searchInput.addEventListener('input', renderPoems);
    if(sortBySelect) sortBySelect.addEventListener('change', renderPoems);
});

