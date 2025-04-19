<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { RELAYS, ndk, initializeNostr } from '../utils/nostr';
=======
import { useState, useEffect, useCallback, useContext } from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { ndk, initializeNostr } from '../utils/nostr';
import { NostrContext } from '../contexts/NostrContext';
import { useAuth } from '../hooks/useAuth';
>>>>>>> Simple-updates

export const RunClub = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
<<<<<<< HEAD

  const processAndUpdatePosts = useCallback(async (posts) => {
    try {
      console.log('Processing posts:', posts);
      const authors = [...new Set(posts.map((post) => post.pubkey))];
=======
  const { defaultZapAmount } = useContext(NostrContext);
  const [userLikes, setUserLikes] = useState(new Set());
  const [userReposts, setUserReposts] = useState(new Set());
  const { wallet } = useAuth();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadedSupplementaryData, setLoadedSupplementaryData] = useState(new Set());

  const processBasicPostData = useCallback(async (newPosts) => {
    try {
      if (!newPosts || newPosts.length === 0) {
        return [];
      }

      console.log('Processing basic post data for', newPosts.length, 'posts');
      const authors = [...new Set(newPosts.map((post) => post.pubkey))];
      
>>>>>>> Simple-updates
      const profileEvents = await ndk.fetchEvents({
        kinds: [0],
        authors
      });

      const profileMap = new Map(
        Array.from(profileEvents).map((profile) => {
          try {
            return [profile.pubkey, JSON.parse(profile.content)];
          } catch (err) {
            console.error('Error parsing profile:', err);
            return [profile.pubkey, {}];
          }
        })
      );

<<<<<<< HEAD
      // Fetch comments for all posts
      const comments = await ndk.fetchEvents({
        kinds: [1],
        '#e': posts.map((post) => post.id)
      });

      // Group comments by their parent post
      const commentsByPost = new Map();
      Array.from(comments).forEach((comment) => {
        const parentId = comment.tags.find((tag) => tag[0] === 'e')?.[1];
        if (parentId) {
          if (!commentsByPost.has(parentId)) {
            commentsByPost.set(parentId, []);
          }
          const profile = profileMap.get(comment.pubkey) || {};
          commentsByPost.get(parentId).push({
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            author: {
              pubkey: comment.pubkey,
              profile: profile
            }
          });
        }
      });

      return posts
        .map((post) => {
          const profile = profileMap.get(post.pubkey) || {};
=======
      return newPosts
        .map((post) => {
          const profile = profileMap.get(post.pubkey) || {};
          
>>>>>>> Simple-updates
          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            author: {
              pubkey: post.pubkey,
              profile: profile,
              lud16: profile.lud16,
              lud06: profile.lud06
            },
<<<<<<< HEAD
            comments: commentsByPost.get(post.id) || [],
            showComments: false
=======
            comments: [],
            showComments: false,
            likes: 0,
            reposts: 0,
            zaps: 0,
            zapAmount: 0,
            hasFullData: false
>>>>>>> Simple-updates
          };
        })
        .sort((a, b) => b.created_at - a.created_at);
    } catch (err) {
<<<<<<< HEAD
      console.error('Error processing posts:', err);
      return posts.sort((a, b) => b.created_at - a.created_at);
    }
  }, []);

  const fetchRunPosts = useCallback(async () => {
    try {
      console.log('Fetching run posts...');
      if (!window.nostr) {
        throw new Error('Please login to view running posts');
      }

      // Ensure NDK is connected
      if (!ndk.pool?.relays?.size) {
        console.log('NDK not connected, connecting...');
        const connected = await initializeNostr();
        if (!connected) {
          throw new Error('Could not connect to relays');
        }
      }

      console.log(
        'NDK ready state:',
        ndk.pool?.relays?.size || 0,
        'relays connected'
      );

      const filter = {
        kinds: [1],
        '#t': ['Runstr', 'Running', 'run', 'running'],
        since: Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60,
        limit: 100
      };

      console.log('Fetching events with filter:', filter);

      const events = await ndk.fetchEvents(filter);
      const eventArray = Array.from(events);
      console.log('Number of events:', eventArray.length);

      if (eventArray.length > 0) {
        const processedPosts = await processAndUpdatePosts(eventArray);
        setPosts(processedPosts);
      } else {
        console.log('No events found');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error in fetchRunPosts:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [processAndUpdatePosts]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!window.nostr) {
          setError('Please login to view running posts');
          setLoading(false);
          return;
        }

        console.log('NDK initialized, fetching posts...');
        if (mounted) {
          await fetchRunPosts();
        }
      } catch (err) {
        console.error('Error in init:', err);
        if (mounted) {
          setError('Failed to fetch posts: ' + err.message);
          setLoading(false);
        }
      }
    };

=======
      console.error('Error processing basic post data:', err);
      return newPosts.map(post => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        author: {
          pubkey: post.pubkey,
          profile: {}
        },
        comments: [],
        showComments: false,
        likes: 0,
        reposts: 0,
        zaps: 0,
        zapAmount: 0,
        hasFullData: false
      })).sort((a, b) => b.created_at - a.created_at);
    }
  }, []);

  const loadSupplementaryData = useCallback(async (postId) => {
    if (loadedSupplementaryData.has(postId)) {
      return;
    }

    console.log('Loading supplementary data for post:', postId);
    setLoadedSupplementaryData(prev => new Set([...prev, postId]));

    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = posts[postIndex];
    
    const [comments, likes, reposts, zapReceipts] = await Promise.all([
      ndk.fetchEvents({
        kinds: [1],
        '#e': [postId]
      }),
      ndk.fetchEvents({
        kinds: [7],
        '#e': [postId]
      }),
      ndk.fetchEvents({
        kinds: [6],
        '#e': [postId]
      }),
      ndk.fetchEvents({
        kinds: [9735],
        '#e': [postId]
      })
    ]);

    const commentAuthors = [...new Set(Array.from(comments).map(c => c.pubkey))];
    
    const commentProfileEvents = commentAuthors.length > 0 ? await ndk.fetchEvents({
      kinds: [0],
      authors: commentAuthors
    }) : new Set();

    const profileMap = new Map(
      Array.from(commentProfileEvents).map((profile) => {
        try {
          return [profile.pubkey, JSON.parse(profile.content)];
        } catch (err) {
          console.error('Error parsing profile:', err);
          return [profile.pubkey, {}];
        }
      })
    );

    let userPubkey = '';
    try {
      if (window.nostr) {
        userPubkey = await window.nostr.getPublicKey();
      }
    } catch (err) {
      console.error('Error getting user pubkey:', err);
    }

    let likesCount = 0;
    let userLiked = false;
    Array.from(likes).forEach(like => {
      likesCount++;
      if (like.pubkey === userPubkey) {
        userLiked = true;
      }
    });

    let repostsCount = 0;
    let userReposted = false;
    Array.from(reposts).forEach(repost => {
      repostsCount++;
      if (repost.pubkey === userPubkey) {
        userReposted = true;
      }
    });

    let zapCount = 0;
    let zapAmount = 0;
    Array.from(zapReceipts).forEach(zapReceipt => {
      try {
        zapCount++;
        
        const amountTag = zapReceipt.tags.find(tag => tag[0] === 'amount');
        if (amountTag && amountTag[1]) {
          zapAmount += parseInt(amountTag[1], 10) / 1000;
        }
      } catch (err) {
        console.error('Error processing zap receipt:', err);
      }
    });

    const processedComments = Array.from(comments).map((comment) => {
      const profile = profileMap.get(comment.pubkey) || {};
      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        author: {
          pubkey: comment.pubkey,
          profile: profile
        }
      };
    }).sort((a, b) => a.created_at - b.created_at);

    if (userLiked) {
      setUserLikes(prev => new Set([...prev, postId]));
    }
    
    if (userReposted) {
      setUserReposts(prev => new Set([...prev, postId]));
    }

    const updatedPost = {
      ...post,
      comments: processedComments,
      likes: likesCount,
      reposts: repostsCount,
      zaps: zapCount,
      zapAmount: zapAmount,
      hasFullData: true
    };

    setPosts(currentPosts => {
      const newPosts = [...currentPosts];
      newPosts[postIndex] = updatedPost;
      return newPosts;
    });

  }, [posts, loadedSupplementaryData]);

  const processAndUpdatePosts = useCallback(async (newPosts, append = false) => {
    if (!newPosts || newPosts.length === 0) {
      if (!append) {
        setPosts([]);
      }
      return [];
    }
    
    const processedPosts = await processBasicPostData(newPosts);
    
    return processedPosts;
  }, [processBasicPostData]);

  const fetchRunPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await initializeNostr();

      const limit = 10;
      const since = page > 1 ? Date.now() - (page * 7 * 24 * 60 * 60 * 1000) : undefined;
  
      const runPosts = await ndk.fetchEvents({
        kinds: [1],
        limit,
        since,
        "#t": ["running", "run", "runner", "runstr", "5k", "10k", "marathon", "jog"]
      });

      const postsArray = Array.from(runPosts).sort((a, b) => b.created_at - a.created_at);
      
      if (postsArray.length < limit) {
        setHasMore(false);
      }
      
      const processedPosts = await processAndUpdatePosts(postsArray, page > 1);
      
      if (page === 1) {
        setPosts(processedPosts);
      } else {
        setPosts(prevPosts => [...prevPosts, ...processedPosts]);
      }
      
      setInitialLoadComplete(true);
    } catch (err) {
      console.error('Error fetching run posts:', err);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [page, processAndUpdatePosts]);

  const loadMorePosts = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if ((page === 1 || initialLoadComplete) && mounted) {
        await fetchRunPosts();
      }
    };
    
>>>>>>> Simple-updates
    init();

    return () => {
      mounted = false;
    };
<<<<<<< HEAD
  }, [fetchRunPosts]);

  const handleZap = async (post) => {
=======
  }, [fetchRunPosts, page, initialLoadComplete]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 300
      ) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts]);

  const handleCommentClick = (postId) => {
    if (!loadedSupplementaryData.has(postId)) {
      loadSupplementaryData(postId);
    }
    
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { ...post, showComments: !post.showComments }
          : post
      )
    );
  };

  const handleLike = async (post) => {
    if (!loadedSupplementaryData.has(post.id)) {
      await loadSupplementaryData(post.id);
    }
    
    if (!window.nostr) {
      alert('Please login to like posts');
      return;
    }

    try {
      const likeEvent = {
        kind: 7,
        created_at: Math.floor(Date.now() / 1000),
        content: '+',
        tags: [
          ['e', post.id],
          ['p', post.author.pubkey]
        ],
        pubkey: await window.nostr.getPublicKey()
      };

      const signedEvent = await window.nostr.signEvent(likeEvent);

      const ndkEvent = new NDKEvent(ndk, signedEvent);
      await ndkEvent.publish();

      setUserLikes(prev => {
        const newLikes = new Set(prev);
        newLikes.add(post.id);
        return newLikes;
      });

      setPosts(currentPosts => {
        return currentPosts.map(p => 
          p.id === post.id 
            ? { ...p, likes: p.likes + 1 } 
            : p
        );
      });

      console.log('Post liked successfully');
    } catch (error) {
      console.error('Error liking post:', error);
      alert('Failed to like post: ' + error.message);
    }
  };

  const handleRepost = async (post) => {
    if (!loadedSupplementaryData.has(post.id)) {
      await loadSupplementaryData(post.id);
    }
    
    if (!window.nostr) {
      alert('Please login to repost');
      return;
    }

    try {
      const repostEvent = {
        kind: 6,
        created_at: Math.floor(Date.now() / 1000),
        content: '',
        tags: [
          ['e', post.id, '', 'mention'],
          ['p', post.author.pubkey]
        ],
        pubkey: await window.nostr.getPublicKey()
      };

      const signedEvent = await window.nostr.signEvent(repostEvent);

      const ndkEvent = new NDKEvent(ndk, signedEvent);
      await ndkEvent.publish();

      setUserReposts(prev => {
        const newReposts = new Set(prev);
        newReposts.add(post.id);
        return newReposts;
      });

      setPosts(currentPosts => {
        return currentPosts.map(p => 
          p.id === post.id 
            ? { ...p, reposts: p.reposts + 1 } 
            : p
        );
      });

      console.log('Post reposted successfully');
      alert('Post reposted successfully!');
    } catch (error) {
      console.error('Error reposting:', error);
      alert('Failed to repost: ' + error.message);
    }
  };

  const handleZap = async (post) => {
    if (!loadedSupplementaryData.has(post.id)) {
      await loadSupplementaryData(post.id);
    }

>>>>>>> Simple-updates
    if (!window.nostr) {
      alert('Please login to send zaps');
      return;
    }

<<<<<<< HEAD
    try {
      // Extract LNURL from the post author's profile
      const lnurl = post.author.lud16 || post.author.lud06;
      if (!lnurl) {
        console.log('Author profile:', post.author);
        alert(
          'This user has not set up their Lightning address in their Nostr profile'
        );
        return;
      }

      // Create the zap event
=======
    if (!wallet) {
      alert('Please connect a Bitcoin wallet to send zaps');
      return;
    }

    try {
      console.log('Author profile details:', {
        name: post.author.profile.name,
        pubkey: post.author.pubkey,
        lud16: post.author.lud16,
        lud06: post.author.lud06,
      });

      if (!post.author.lud16 && !post.author.lud06) {
        console.log('Author profile:', post.author);
        alert('This user has not set up their Lightning address in their Nostr profile');
        return;
      }

      try {
        console.log(`Attempting to zap ${defaultZapAmount} sats using NDK...`);
        
        const ndkEvent = new NDKEvent(ndk);
        ndkEvent.id = post.id;
        ndkEvent.pubkey = post.author.pubkey;
        
        if (!ndkEvent.zap) {
          console.warn('NDK zap method not available. Your NDK version may be outdated.');
          throw new Error('NDK zap method not available');
        }
        
        const zapResult = await ndkEvent.zap(
          defaultZapAmount,
          async (invoice) => {
            console.log('Paying invoice with wallet:', invoice.substring(0, 30) + '...');
            return await wallet.makePayment(invoice);
          },
          'Zap for your run! ⚡️'
        );
        
        console.log('NDK Zap successful! Result:', zapResult);
        
        setPosts(currentPosts => 
          currentPosts.map(p => {
            if (p.id === post.id) {
              return {
                ...p,
                zaps: p.zaps + 1,
                zapAmount: p.zapAmount + defaultZapAmount
              };
            }
            return p;
          })
        );

        alert('Zap sent successfully! ⚡️');
        return;
      } catch (ndkZapError) {
        console.error('NDK zap error:', ndkZapError);
        console.warn('NDK zap failed, falling back to manual approach');
      }
        
      console.log('Using fallback manual zap implementation...');
      
      const lnurl = post.author.lud16 || post.author.lud06;
      
>>>>>>> Simple-updates
      const zapEvent = {
        kind: 9734,
        created_at: Math.floor(Date.now() / 1000),
        content: 'Zap for your run! ⚡️',
        tags: [
          ['p', post.author.pubkey],
          ['e', post.id],
<<<<<<< HEAD
          ['relays', ...RELAYS],
          ['amount', '1000'] // 1000 sats
        ],
        pubkey: await window.nostr.getPublicKey()
      };

      // Sign the event
      const signedEvent = await window.nostr.signEvent(zapEvent);

      // Create and publish NDK Event
      const ndkEvent = new NDKEvent(ndk, signedEvent);
      await ndkEvent.publish();

      // Parse the Lightning address and create the zap request URL
      let zapEndpoint;
      if (lnurl.includes('@')) {
        // Handle Lightning address (lud16)
        const [username, domain] = lnurl.split('@');
        zapEndpoint = `https://${domain}/.well-known/lnurlp/${username}`;
      } else {
        // Handle raw LNURL (lud06)
        zapEndpoint = lnurl;
      }

      // First get the LNURL-pay metadata
      const response = await fetch(zapEndpoint);
      const lnurlPayData = await response.json();

      if (!lnurlPayData.callback) {
        throw new Error('Invalid LNURL-pay response: missing callback URL');
      }

      // Amount in millisatoshis (1000 sats = 100000 millisats)
      const amount = 1000 * 1000;

      // Check if amount is within min/max bounds
      if (
        amount < lnurlPayData.minSendable ||
        amount > lnurlPayData.maxSendable
      ) {
        throw new Error(
          `Amount must be between ${lnurlPayData.minSendable} and ${lnurlPayData.maxSendable} millisats`
        );
      }

      // Construct the callback URL with amount
      const callbackUrl = new URL(lnurlPayData.callback);
      callbackUrl.searchParams.append('amount', amount);

      // If there's a nostr event, add it to the callback
      callbackUrl.searchParams.append('nostr', JSON.stringify(signedEvent));

      // Get the invoice
      const invoiceResponse = await fetch(callbackUrl);
      const invoiceData = await invoiceResponse.json();

      if (!invoiceData.pr) {
        throw new Error('Invalid LNURL-pay response: missing payment request');
      }

      // Use Bitcoin Connect to get the provider and pay
      const { requestProvider } = await import('@getalby/bitcoin-connect');
      const provider = await requestProvider();
      await provider.sendPayment(invoiceData.pr);

      alert('Zap sent successfully! ⚡️');
    } catch (error) {
      console.error('Error sending zap:', error);
      alert('Failed to send zap: ' + error.message);
=======
          ['amount', (defaultZapAmount * 1000).toString()],
        ],
        pubkey: await window.nostr.getPublicKey()
      };
      
      const signedEvent = await window.nostr.signEvent(zapEvent);
      
      const ndkEvent = new NDKEvent(ndk, signedEvent);
      await ndkEvent.publish();
      console.log('Published zap request event:', ndkEvent);
      
      let zapEndpoint;
      if (lnurl.includes('@')) {
        const [username, domain] = lnurl.split('@');
        zapEndpoint = `https://${domain}/.well-known/lnurlp/${username}`;
        console.log('Using lud16 Lightning address:', lnurl);
      } else {
        zapEndpoint = lnurl;
        console.log('Using lud06 LNURL:', lnurl);
      }
      
      console.log('Fetching LNURL-pay metadata from:', zapEndpoint);
      const response = await fetch(zapEndpoint);
      const lnurlPayData = await response.json();
      console.log('LNURL-pay metadata:', lnurlPayData);
      
      if (!lnurlPayData.callback) {
        throw new Error('Invalid LNURL-pay response: missing callback URL');
      }
      
      const amount = defaultZapAmount * 1000;
      
      const callbackUrl = new URL(lnurlPayData.callback);
      callbackUrl.searchParams.append('amount', amount);
      callbackUrl.searchParams.append('nostr', JSON.stringify(signedEvent));
      
      console.log('Requesting invoice from:', callbackUrl.toString());
      const invoiceResponse = await fetch(callbackUrl);
      const invoiceData = await invoiceResponse.json();
      console.log('Invoice data:', invoiceData);
      
      if (!invoiceData.pr) {
        throw new Error(
          'Invalid invoice response: missing payment request'
        );
      }
      
      await wallet.makePayment(invoiceData.pr);
      
      setPosts(currentPosts => 
        currentPosts.map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              zaps: p.zaps + 1,
              zapAmount: p.zapAmount + defaultZapAmount
            };
          }
          return p;
        })
      );
      
      alert('Zap sent successfully! ⚡️');

    } catch (error) {
      console.error('Error sending zap:', error);
      
      let errorMessage = 'Failed to send zap: ';
      
      if (error.message.includes('LNURL') || error.message.includes('Lightning')) {
        errorMessage += 'There was an issue with the Lightning address. The receiver might need to update their LNURL configuration.';
      } else if (error.message.includes('wallet') || error.message.includes('provider')) {
        errorMessage += 'Could not connect to your Lightning wallet. Please make sure you have a Lightning wallet installed and configured.';
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage += `Network error: ${error.message}. This could be due to CORS issues or the service being unavailable.`;
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
>>>>>>> Simple-updates
    }
  };

  const handleComment = async (postId) => {
<<<<<<< HEAD
=======
    if (!loadedSupplementaryData.has(postId)) {
      await loadSupplementaryData(postId);
    }
    
>>>>>>> Simple-updates
    if (!commentText.trim() || !window.nostr) {
      alert('Please login and enter a comment');
      return;
    }

    try {
      const commentEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        content: commentText,
        tags: [
          ['e', postId, '', 'reply'],
          ['k', '1']
        ],
        pubkey: await window.nostr.getPublicKey()
      };

<<<<<<< HEAD
      // Sign the event
      const signedEvent = await window.nostr.signEvent(commentEvent);

      // Create NDK Event and publish
=======
      const signedEvent = await window.nostr.signEvent(commentEvent);

>>>>>>> Simple-updates
      const ndkEvent = new NDKEvent(ndk, signedEvent);
      await ndkEvent.publish();

      setCommentText('');
<<<<<<< HEAD
      // Refresh posts to show new comment
=======
>>>>>>> Simple-updates
      fetchRunPosts();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    }
  };

<<<<<<< HEAD
  const handleCommentClick = (postId) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { ...post, showComments: !post.showComments }
          : post
      )
    );
  };

=======
>>>>>>> Simple-updates
  const extractImagesFromContent = (content) => {
    const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;
    return content.match(urlRegex) || [];
  };

<<<<<<< HEAD
  return (
    <div className="run-club-container">
      <h2>Running Feed</h2>
      {loading ? (
        <div>Loading posts...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="posts-list">
          {posts.length === 0 ? (
            <p>
              No running posts found. Follow some runners or post your own runs!
            </p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="post-item">
                <div className="post-header">
                  <img
                    src={post.author.profile.picture || '/default-avatar.png'}
                    alt={post.author.profile.name || 'Anonymous'}
                    className="author-avatar"
                  />
                  <div className="author-info">
                    <h4>{post.author.profile.name || 'Anonymous Runner'}</h4>
                    <span>
                      {new Date(post.created_at * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="post-content">
                  {post.content}
                  <div className="post-images">
                    {extractImagesFromContent(post.content).map(
                      (imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt="Run activity"
                          className="post-image"
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="post-actions">
                  <button
                    className="zap-button"
                    onClick={() => handleZap(post)}
                  >
                    ⚡️ Zap
                  </button>
                  <button
                    className="comment-button"
                    onClick={() => handleCommentClick(post.id)}
                  >
                    💬 {post.comments?.length || 0}
                  </button>
                </div>
                {post.showComments && (
                  <div className="comments-section">
                    <div className="comments-list">
                      {post.comments?.map((comment) => (
                        <div key={comment.id} className="comment-item">
                          <img
                            src={
                              comment.author.profile.picture ||
                              '/default-avatar.png'
                            }
                            alt={comment.author.profile.name}
                            className="comment-avatar"
                          />
                          <div className="comment-content">
                            <strong>
                              {comment.author.profile.name || 'Anonymous'}
                            </strong>
                            <p>{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="comment-input">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === 'Enter' && handleComment(post.id)
                        }
                      />
                      <button onClick={() => handleComment(post.id)}>
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
=======
  const checkPostVisibility = useCallback(() => {
    const postElements = document.querySelectorAll('.post-card');
    
    postElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const postId = element.getAttribute('data-post-id');
      
      if (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      ) {
        if (postId && !loadedSupplementaryData.has(postId)) {
          loadSupplementaryData(postId);
        }
      }
    });
  }, [loadSupplementaryData, loadedSupplementaryData]);

  useEffect(() => {
    const handleVisibilityCheck = () => {
      checkPostVisibility();
    };

    if (!loading && posts.length > 0) {
      setTimeout(handleVisibilityCheck, 500);
    }

    window.addEventListener('scroll', handleVisibilityCheck);
    return () => window.removeEventListener('scroll', handleVisibilityCheck);
  }, [loading, posts, checkPostVisibility]);

  return (
    <div className="run-club-container">
      <h2>RUNSTR FEED</h2>
      {loading && page === 1 ? (
        <div className="loading-indicator">Loading posts...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : posts.length === 0 ? (
        <div className="no-posts-message">No running posts found</div>
      ) : (
        <div className="posts-container">
          {posts.map((post) => (
            <div key={post.id} className="post-card" data-post-id={post.id}>
              <div className="post-header">
                <img
                  src={post.author.profile.picture || '/default-avatar.png'}
                  alt={post.author.profile.name || 'Anonymous'}
                  className="author-avatar"
                  loading="lazy"
                />
                <div className="author-info">
                  <h4>{post.author.profile.name || 'Anonymous Runner'}</h4>
                  <span>
                    {new Date(post.created_at * 1000).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="post-content">
                {post.content}
                <div className="post-images">
                  {extractImagesFromContent(post.content).map(
                    (imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt="Run activity"
                        className="post-image"
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    )
                  )}
                </div>
              </div>
              <div className="post-actions">
                <button
                  className="zap-button"
                  onClick={() => handleZap(post)}
                >
                  ⚡️ {post.zaps > 0 ? post.zaps : ''}
                </button>
                <button
                  className={`like-button ${userLikes.has(post.id) ? 'liked' : ''}`}
                  onClick={() => handleLike(post)}
                >
                  {userLikes.has(post.id) ? '❤️' : '🤍'} {post.likes > 0 ? post.likes : ''}
                </button>
                <button
                  className={`repost-button ${userReposts.has(post.id) ? 'reposted' : ''}`}
                  onClick={() => handleRepost(post)}
                >
                  {userReposts.has(post.id) ? '🔁' : '🔄'} {post.reposts > 0 ? post.reposts : ''}
                </button>
                <button
                  className="comment-button"
                  onClick={() => handleCommentClick(post.id)}
                >
                  💬 {post.comments?.length || 0}
                </button>
              </div>
              {post.showComments && (
                <div className="comments-section">
                  <div className="comments-list">
                    {post.comments?.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <img
                          src={
                            comment.author.profile.picture ||
                            '/default-avatar.png'
                          }
                          alt={comment.author.profile.name}
                          className="comment-avatar"
                        />
                        <div className="comment-content">
                          <strong>
                            {comment.author.profile.name || 'Anonymous'}
                          </strong>
                          <p>{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="comment-input">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && handleComment(post.id)
                      }
                    />
                    <button onClick={() => handleComment(post.id)}>
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && page > 1 && (
            <div className="loading-more">Loading more posts...</div>
>>>>>>> Simple-updates
          )}
        </div>
      )}
    </div>
  );
<<<<<<< HEAD
};
=======
};
>>>>>>> Simple-updates
