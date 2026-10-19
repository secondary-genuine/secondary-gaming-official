const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector("#primary-navigation");
const ACCOUNT_STORAGE_KEY = "secondary-gaming.accounts.v1";
const SESSION_STORAGE_KEY = "secondary-gaming.session.v1";
const LAST_ACCOUNT_ID_KEY = "secondary-gaming.last-account-id.v1";
const COMMUNITY_POSTS_STORAGE_KEY = "secondary-gaming.community-posts.v1";
const POST_LIKES_STORAGE_KEY = "secondary-gaming.post-likes.v1";
const POST_CATEGORIES = ["update", "announcement"];
const AVATAR_CHOICES = {
  gamer: { emoji: "🎮", label: "Gamer" },
  wolf: { emoji: "🐺", label: "Wolf" },
  cat: { emoji: "🐱", label: "Cat" },
  fox: { emoji: "🦊", label: "Fox" },
  panda: { emoji: "🐼", label: "Panda" },
  owl: { emoji: "🦉", label: "Owl" },
  rocket: { emoji: "🚀", label: "Rocket" },
  alien: { emoji: "👾", label: "Alien" },
};

const recommendedVideoList = document.querySelector("#recommended-channel-list");
const recommendedVideoStatus = document.querySelector("#recommended-status");

if (recommendedVideoList instanceof HTMLElement && recommendedVideoStatus instanceof HTMLElement) {
  const formatVideoDate = (publishedAt) => {
    const date = new Date(publishedAt);
    if (Number.isNaN(date.getTime())) {
      return "Recently uploaded";
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  };

  const createVideoCard = (video) => {
    if (
      typeof video.id !== "string" ||
      !/^[A-Za-z0-9_-]{11}$/.test(video.id) ||
      typeof video.title !== "string" ||
      typeof video.publishedAt !== "string"
    ) {
      throw new Error("A YouTube recommendation has invalid video details.");
    }

    const link = document.createElement("a");
    link.className = "recommended-video-card";
    link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Watch ${video.title} on YouTube`);

    const thumbnail = document.createElement("span");
    thumbnail.className = "recommended-video-thumbnail";
    const image = document.createElement("img");
    image.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`;
    image.alt = "";
    image.loading = "lazy";
    image.width = 480;
    image.height = 360;
    const playIcon = document.createElement("span");
    playIcon.className = "recommended-play-icon";
    playIcon.setAttribute("aria-hidden", "true");
    playIcon.textContent = "▶";
    thumbnail.append(image, playIcon);

    const title = document.createElement("strong");
    title.className = "recommended-video-title";
    title.textContent = video.title;

    const date = document.createElement("span");
    date.className = "recommended-video-date";
    date.textContent = formatVideoDate(video.publishedAt);
    link.append(thumbnail, title, date);
    return link;
  };

  const loadRecommendedVideos = async () => {
    try {
      const response = await fetch("/api/recommended-videos");
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The recommendations API is unavailable on this site.");
      }
      if (!response.ok || !Array.isArray(result.channels)) {
        const message =
          typeof result.error === "string"
            ? result.error
            : "Could not load YouTube recommendations.";
        throw new Error(message);
      }

      const videosByHandle = new Map(
        result.channels.map((channel) => [channel.handle, channel.videos]),
      );
      recommendedVideoList.querySelectorAll(".recommended-video-row").forEach((row) => {
        const handle = row.dataset.handle;
        const videos = videosByHandle.get(handle);
        if (!Array.isArray(videos)) {
          throw new Error(`Recommendations for @${handle} are missing.`);
        }

        const cards = videos.slice(0, 4).map(createVideoCard);
        if (cards.length === 0) {
          const empty = document.createElement("p");
          empty.className = "recommended-row-empty";
          empty.textContent = "No recent public uploads are available yet.";
          row.replaceChildren(empty);
        } else {
          row.replaceChildren(...cards);
        }
      });
      recommendedVideoStatus.textContent = "The latest public videos and Shorts from each channel.";
      recommendedVideoStatus.classList.remove("is-error");
    } catch (error) {
      console.error("Could not load YouTube recommendations.", error);
      recommendedVideoStatus.textContent =
        error instanceof Error
          ? error.message
          : "Could not load YouTube recommendations. Try again later.";
      recommendedVideoStatus.classList.add("is-error");
      recommendedVideoList.querySelectorAll(".recommended-video-row").forEach((row) => {
        const message = document.createElement("p");
        message.className = "recommended-row-empty";
        message.textContent = "Videos are temporarily unavailable.";
        row.replaceChildren(message);
      });
    }
  };

  loadRecommendedVideos();
}

const setProfilePicture = (element, avatarId) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const choice = AVATAR_CHOICES[avatarId] ?? AVATAR_CHOICES.gamer;
  element.className = `nav-avatar has-picture avatar-tone-${AVATAR_CHOICES[avatarId] ? avatarId : "gamer"}`;
  element.textContent = choice.emoji;
  element.setAttribute("aria-label", `${choice.label} profile picture`);
};

const readCommunityPosts = () => {
  const savedPosts = localStorage.getItem(COMMUNITY_POSTS_STORAGE_KEY);
  if (savedPosts === null) {
    return [];
  }

  const posts = JSON.parse(savedPosts);
  if (
    !Array.isArray(posts) ||
    posts.some(
      (post) =>
        typeof post.id !== "string" ||
        typeof post.title !== "string" ||
        !POST_CATEGORIES.includes(post.category) ||
        typeof post.body !== "string" ||
        typeof post.createdAt !== "string" ||
        typeof post.likes !== "number" ||
        (post.authorUsername !== undefined && typeof post.authorUsername !== "string") ||
        (post.authorAvatarId !== undefined &&
          (typeof post.authorAvatarId !== "string" || !Object.hasOwn(AVATAR_CHOICES, post.authorAvatarId))),
    )
  ) {
    throw new Error("Saved community posts are invalid. Clear this site's post data to start over.");
  }

  return posts;
};

const readLikedPostIds = () => {
  const savedLikes = localStorage.getItem(POST_LIKES_STORAGE_KEY);
  if (savedLikes === null) {
    return [];
  }
  const likedIds = JSON.parse(savedLikes);
  if (!Array.isArray(likedIds) || likedIds.some((id) => typeof id !== "string")) {
    throw new Error("Saved post likes are invalid. Clear this site's post-like data to start over.");
  }
  return likedIds;
};

if (menuToggle instanceof HTMLButtonElement && navMenu instanceof HTMLElement) {
  const closeMenu = () => {
    navMenu.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Open navigation menu" : "Close navigation menu",
    );
    navMenu.classList.toggle("is-open", !isOpen);
  });

  navMenu.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuToggle.focus();
    }
  });
}

const postCategories = document.querySelectorAll(".post-category");
const postList = document.querySelector(".post-list");

if (postCategories.length > 0 && postList instanceof HTMLElement) {
  const emptyState = postList.querySelector(".posts-empty");
  const emptyHeading = emptyState?.querySelector("h3");
  const emptyDescription = emptyState?.querySelector(".empty-description");

  const categoryCopy = {
    all: {
      heading: "No posts just yet",
      description: "There are no posts here yet. Check back soon for updates and announcements.",
    },
    update: {
      heading: "No updates just yet",
      description: "There are no updates yet. Check back soon for the latest news.",
    },
    announcement: {
      heading: "No announcements just yet",
      description: "There are no announcements yet. Check back soon for community news.",
    },
  };

  postCategories.forEach((categoryButton) => {
    categoryButton.addEventListener("click", () => {
      const category = categoryButton.dataset.category ?? "all";
      const cards = postList.querySelectorAll(".post-card");
      let visibleCount = 0;

      postCategories.forEach((button) => {
        const isActive = button === categoryButton;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      cards.forEach((card) => {
        const matchesCategory = category === "all" || card.getAttribute("data-category") === category;
        card.hidden = !matchesCategory;
        if (matchesCategory) {
          visibleCount += 1;
        }
      });

      if (emptyState instanceof HTMLElement) {
        emptyState.hidden = visibleCount > 0;
      }
      if (emptyHeading instanceof HTMLElement && emptyDescription instanceof HTMLElement) {
        const copy = categoryCopy[category] ?? categoryCopy.all;
        emptyHeading.textContent = copy.heading;
        emptyDescription.textContent = copy.description;
      }

      postList.scrollTop = 0;
    });
  });
}

if (postList instanceof HTMLElement) {
  const postTemplate = postList.querySelector("#community-post-template");
  const emptyState = postList.querySelector(".posts-empty");

  if (postTemplate instanceof HTMLTemplateElement) {
    try {
      const posts = readCommunityPosts();
      const likedPostIds = readLikedPostIds();
      posts.forEach((post) => {
        const fragment = postTemplate.content.cloneNode(true);
        const card = fragment.querySelector(".post-card");
        const title = fragment.querySelector(".post-title > span:first-child");
        const categoryTag = fragment.querySelector(".post-category-tag");
        const body = fragment.querySelector(".post-body");
        const date = fragment.querySelector(".post-date");
        const avatar = fragment.querySelector(".post-avatar");
        const authorName = fragment.querySelector(".post-meta strong");
        const likeButton = fragment.querySelector(".post-like");
        const likeCount = fragment.querySelector(".like-count");
        const likeLabel = fragment.querySelector(".like-label");

        if (
          !(card instanceof HTMLElement) ||
          !(title instanceof HTMLElement) ||
          !(categoryTag instanceof HTMLElement) ||
          !(body instanceof HTMLElement) ||
          !(date instanceof HTMLElement) ||
          !(avatar instanceof HTMLElement) ||
          !(authorName instanceof HTMLElement) ||
          !(likeButton instanceof HTMLButtonElement) ||
          !(likeCount instanceof HTMLElement) ||
          !(likeLabel instanceof HTMLElement)
        ) {
          throw new Error("The community post template is missing required elements.");
        }

        const categoryLabel = post.category === "announcement" ? "Announcement" : "Update";
        const liked = likedPostIds.includes(post.id);
        const authorAvatarId = post.authorAvatarId && Object.hasOwn(AVATAR_CHOICES, post.authorAvatarId)
          ? post.authorAvatarId
          : undefined;
        card.dataset.postId = post.id;
        card.dataset.category = post.category;
        authorName.textContent = post.authorUsername || "Secondary Gaming";
        if (post.category === "announcement") {
          avatar.className = "post-avatar post-announcement-avatar";
          const announcementIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          announcementIcon.setAttribute("viewBox", "0 0 24 24");
          announcementIcon.setAttribute("aria-hidden", "true");
          const iconShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
          iconShape.setAttribute(
            "d",
            "M3 10v4h3l4 3V7l-4 3H3Zm9-5v14l9-3.8V8.8L12 5Zm-6.5 9H5l1.8 4.2H9L7 14Z",
          );
          announcementIcon.append(iconShape);
          avatar.replaceChildren(announcementIcon);
        } else if (authorAvatarId) {
          avatar.className = `post-avatar has-picture avatar-tone-${authorAvatarId}`;
          avatar.textContent = AVATAR_CHOICES[authorAvatarId].emoji;
        }
        title.textContent = post.title;
        categoryTag.textContent = categoryLabel;
        body.textContent = post.body;
        date.textContent = new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(post.createdAt));
        likeButton.setAttribute("aria-pressed", String(liked));
        likeButton.setAttribute("aria-label", liked ? "Unlike this post" : "Like this post");
        likeCount.textContent = String(post.likes);
        likeLabel.textContent = liked ? "Liked" : "Like";
        postList.append(fragment);
      });
      if (emptyState instanceof HTMLElement) {
        emptyState.hidden = posts.length > 0;
      }
    } catch (error) {
      console.error("Could not load community posts.", error);
    }
  }
}

const navActions = document.querySelector(".nav-actions");

const updateNavigation = () => {
  if (!(navActions instanceof HTMLElement)) {
    return;
  }

  let username = null;
  let accounts;
  try {
    username = localStorage.getItem(SESSION_STORAGE_KEY);
    accounts = readLocalAccounts();
  } catch (error) {
    console.error("Could not read the saved local profile.", error);
    return;
  }

  if (!username) {
    return;
  }

  const account = accounts.find((savedAccount) => savedAccount.username === username);
  if (!account) {
    console.error("The signed-in profile is missing from local account storage.");
    return;
  }
  if (account.disabled === true) {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      window.location.replace("login.html");
    } catch (error) {
      console.error("Could not sign out the disabled account.", error);
    }
    return;
  }

  const profile = document.createElement("div");
  profile.className = "nav-profile";
  profile.setAttribute("aria-label", `Logged in as ${username}`);

  const profileLink = document.createElement("a");
  profileLink.className = "nav-profile-link";
  profileLink.href = "profile.html";
  profileLink.setAttribute("aria-label", `View profile for ${username}`);

  const avatar = document.createElement("span");
  avatar.setAttribute("aria-hidden", "true");
  setProfilePicture(avatar, account.avatarId);

  const name = document.createElement("span");
  name.className = "nav-username";
  name.textContent = username;
  profileLink.append(avatar, name);

  const logout = document.createElement("button");
  logout.className = "nav-logout";
  logout.type = "button";
  logout.textContent = "Log out";
  logout.addEventListener("click", () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      window.location.assign("index.html");
    } catch {
      window.alert("Could not log out because browser storage is unavailable.");
    }
  });

  profile.append(profileLink, logout);
  navActions.replaceChildren(profile);
};

const encodeBytes = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const createCredentialHash = async (password, pin, salt) => {
  if (!crypto.subtle) {
    throw new Error("Secure browser cryptography is unavailable. Open this site over HTTPS or localhost.");
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${password}\u0000${pin}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return encodeBytes(new Uint8Array(derivedBits));
};

const readLocalAccounts = () => {
  const savedAccounts = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (savedAccounts === null) {
    return [];
  }

  const accounts = JSON.parse(savedAccounts);
  if (
    !Array.isArray(accounts) ||
    accounts.some(
      (account) =>
        typeof account.username !== "string" ||
        typeof account.email !== "string" ||
        typeof account.salt !== "string" ||
        typeof account.credentialHash !== "string" ||
        (account.id !== undefined && typeof account.id !== "string") ||
        (account.disabled !== undefined && typeof account.disabled !== "boolean") ||
        (account.moderator !== undefined && typeof account.moderator !== "boolean") ||
        (account.avatarId !== undefined &&
          (typeof account.avatarId !== "string" || !Object.hasOwn(AVATAR_CHOICES, account.avatarId))),
    )
  ) {
    throw new Error("Saved account data is invalid. Clear this site's local data to start over.");
  }

  const usedIds = new Set();
  let highestId = 0n;
  accounts.forEach((account) => {
    const match = /^SG-(\d+)$/.exec(account.id ?? "");
    if (match) {
      const numericId = BigInt(match[1]);
      if (numericId > highestId) {
        highestId = numericId;
      }
    }
  });

  const storedLastId = localStorage.getItem(LAST_ACCOUNT_ID_KEY);
  if (storedLastId !== null) {
    if (!/^\d+$/.test(storedLastId)) {
      throw new Error("Saved account ID sequence is invalid. Clear this site's local data to start over.");
    }
    if (BigInt(storedLastId) > highestId) {
      highestId = BigInt(storedLastId);
    }
  }

  let changed = false;
  accounts.forEach((account) => {
    const match = /^SG-(\d+)$/.exec(account.id ?? "");
    if (match && BigInt(match[1]) > 0n && !usedIds.has(account.id)) {
      usedIds.add(account.id);
      return;
    }

    do {
      highestId += 1n;
      account.id = `SG-${highestId}`;
    } while (usedIds.has(account.id));
    usedIds.add(account.id);
    changed = true;
  });

  if (changed) {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
  }
  if (changed || storedLastId !== String(highestId)) {
    localStorage.setItem(LAST_ACCOUNT_ID_KEY, String(highestId));
  }

  return accounts;
};

updateNavigation();

const profilePage = document.querySelector(".profile-card");
if (profilePage instanceof HTMLElement) {
  try {
    const username = localStorage.getItem(SESSION_STORAGE_KEY);
    const account = username
      ? readLocalAccounts().find((savedAccount) => savedAccount.username === username)
      : undefined;

    if (!account || account.disabled === true) {
      window.location.replace("login.html");
    } else {
      const usernameElement = profilePage.querySelector("#profile-username");
      const idElement = profilePage.querySelector("#profile-id");
      const emailElement = profilePage.querySelector("#profile-email");
      const profileAvatar = profilePage.querySelector("#profile-avatar");
      const adminLink = document.querySelector(".admin-action");
      const deleteButton = document.querySelector("#delete-account");
      if (
        usernameElement instanceof HTMLElement &&
        idElement instanceof HTMLElement &&
        emailElement instanceof HTMLElement
      ) {
        usernameElement.textContent = account.username;
        idElement.textContent = account.id;
        emailElement.textContent = account.email;
      }
      setProfilePicture(profileAvatar, account.avatarId);
      const avatarButtons = document.querySelectorAll(".avatar-option");
      const avatarSaveMessage = document.querySelector("#avatar-save-message");
      avatarButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
          return;
        }
        const selected = button.dataset.avatarId === (account.avatarId ?? "gamer");
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
        button.addEventListener("click", () => {
          const avatarId = button.dataset.avatarId;
          if (!avatarId || !Object.hasOwn(AVATAR_CHOICES, avatarId)) {
            return;
          }
          try {
            const accounts = readLocalAccounts();
            const currentAccount = accounts.find((savedAccount) => savedAccount.id === account.id);
            if (!currentAccount) {
              throw new Error("Your account could not be found in local storage.");
            }
            currentAccount.avatarId = avatarId;
            localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
            avatarButtons.forEach((option) => {
              const isSelected = option === button;
              option.classList.toggle("is-selected", isSelected);
              option.setAttribute("aria-pressed", String(isSelected));
            });
            setProfilePicture(profileAvatar, avatarId);
            const navAvatar = document.querySelector(".nav-profile-link .nav-avatar");
            setProfilePicture(navAvatar, avatarId);
            if (avatarSaveMessage instanceof HTMLElement) {
              avatarSaveMessage.textContent = `${AVATAR_CHOICES[avatarId].label} profile picture saved.`;
            }
          } catch (error) {
            console.error("Could not save the profile picture.", error);
            if (avatarSaveMessage instanceof HTMLElement) {
              avatarSaveMessage.textContent = "Could not save the profile picture. Check browser storage.";
            }
          }
        });
      });
      if (adminLink instanceof HTMLAnchorElement && account.id === "SG-1") {
        adminLink.hidden = false;
      }
      if (deleteButton instanceof HTMLButtonElement) {
        deleteButton.addEventListener("click", () => {
          const confirmed = window.confirm(
            "Delete this account from this browser? This action cannot be undone.",
          );
          if (!confirmed) {
            return;
          }

          try {
            const remainingAccounts = readLocalAccounts().filter(
              (savedAccount) => savedAccount.id !== account.id,
            );
            localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(remainingAccounts));
            localStorage.removeItem(SESSION_STORAGE_KEY);
            window.location.assign("index.html");
          } catch (error) {
            console.error("Could not delete the local account.", error);
            window.alert("Could not delete the account. Check browser storage and try again.");
          }
        });
      }
    }
  } catch (error) {
    console.error("Could not load the local profile.", error);
    window.location.replace("login.html");
  }
}

const adminPage = document.querySelector(".admin-card");
if (adminPage instanceof HTMLElement) {
  try {
    const username = localStorage.getItem(SESSION_STORAGE_KEY);
    const account = username
      ? readLocalAccounts().find((savedAccount) => savedAccount.username === username)
      : undefined;

    if (!account || account.disabled === true) {
      window.location.replace("login.html");
    } else if (account.id !== "SG-1") {
      window.location.replace("profile.html");
    } else {
      const usernameElement = adminPage.querySelector("#admin-username");
      if (usernameElement instanceof HTMLElement) {
        usernameElement.textContent = account.username;
      }
    }
  } catch (error) {
    console.error("Could not verify administrator access.", error);
    window.location.replace("profile.html");
  }
}

if (adminPage instanceof HTMLElement) {
  const commandDialog = document.querySelector("#command-dialog");
  const commandForm = document.querySelector("#command-form");
  const commandAccountInput = document.querySelector("#command-account-id");
  const commandAccountLabel = document.querySelector("#command-account-label");
  const commandExtraField = document.querySelector("#command-extra-field");
  const commandTitle = document.querySelector("#command-dialog-title");
  const commandDescription = document.querySelector("#command-dialog-description");
  const commandMessage = document.querySelector("#command-dialog-message");
  const commandSubmit = document.querySelector("#command-submit");
  const accountList = document.querySelector("#admin-account-list");
  const accountDatalist = document.querySelector("#account-id-list");
  let activeCommand = "";

  const getCurrentAdmin = () => {
    const username = localStorage.getItem(SESSION_STORAGE_KEY);
    return username
      ? readLocalAccounts().find((account) => account.username === username && account.id === "SG-1")
      : undefined;
  };

  const refreshAdminAccounts = () => {
    if (!(accountList instanceof HTMLElement) || !(accountDatalist instanceof HTMLDataListElement)) {
      return;
    }

    const accounts = readLocalAccounts();
    accountList.replaceChildren();
    accountDatalist.replaceChildren();

    if (accounts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "command-account-empty";
      empty.textContent = "No accounts are saved in this browser.";
      accountList.append(empty);
      return;
    }

    accounts.forEach((account) => {
      const row = document.createElement("div");
      row.className = "admin-account-row";
      const details = document.createElement("div");
      details.className = "admin-account-details";
      const username = document.createElement("strong");
      username.textContent = account.username;
      const id = document.createElement("span");
      id.textContent = account.id;
      details.append(username, id);

      const state = document.createElement("span");
      const disabled = account.disabled === true;
      state.className = `admin-account-state ${disabled ? "is-disabled" : "is-enabled"}`;
      const role = account.id === "SG-1" ? "Admin" : account.moderator === true ? "Moderator" : "Member";
      state.textContent = `${disabled ? "Disabled" : "Enabled"} · ${role}`;
      row.append(details, state);
      accountList.append(row);

      const option = document.createElement("option");
      option.value = account.id;
      option.label = account.username;
      accountDatalist.append(option);
    });
  };

  const refreshAdminPosts = () => {
    try {
      return readCommunityPosts();
    } catch (error) {
      console.error("Could not load community posts for moderation.", error);
      showCommandMessage(
        error instanceof Error ? error.message : "Could not load community posts.",
      );
      return null;
    }
  };

  const showCommandMessage = (message, success = false) => {
    if (commandMessage instanceof HTMLElement) {
      commandMessage.textContent = message;
      commandMessage.classList.toggle("is-success", success);
    }
  };

  const openCommandDialog = (command) => {
    if (
      !(commandDialog instanceof HTMLDialogElement) ||
      !(commandExtraField instanceof HTMLElement) ||
      !(commandTitle instanceof HTMLElement) ||
      !(commandDescription instanceof HTMLElement) ||
      !(commandAccountInput instanceof HTMLInputElement) ||
      !(commandAccountLabel instanceof HTMLLabelElement) ||
      !(commandSubmit instanceof HTMLButtonElement)
    ) {
      return;
    }

    activeCommand = command;
    commandExtraField.replaceChildren();
    commandAccountInput.value = "";
    showCommandMessage("");
    commandSubmit.disabled = false;
    const deleting = command === "delete-account" || command === "delete-post";
    commandSubmit.classList.toggle("is-danger", deleting);
    commandSubmit.textContent = deleting
      ? command === "delete-post" ? "Delete post" : "Delete account"
      : "Execute command";

    const heading = {
      "create-post": "Create Community Post",
      "delete-post": "Delete Community Post",
      "edit-post": "Edit Community Post",
      "account-status": "Enable / Disable Account",
      "delete-account": "Delete Account",
      "moderator-role": "Grant / Revoke Moderator",
    }[command];
    const description = {
      "create-post": "Write a post for the community board and choose its category.",
      "delete-post": "Choose a community post and type DELETE to confirm its removal.",
      "edit-post": "Choose a community post and update its title, category, or content.",
      "account-status": "Enter the target account ID and choose whether to enable or disable its login.",
      "delete-account": "Enter the account ID to permanently remove it from this browser.",
      "moderator-role": "Enter the target account ID and choose whether to grant or revoke moderator status.",
    }[command];
    commandTitle.textContent = heading;
    commandDescription.textContent = description;
    const createPost = command === "create-post";
    const postCommand = command === "delete-post" || command === "edit-post";
    commandAccountInput.required = !createPost && !postCommand;
    commandAccountInput.hidden = createPost || postCommand;
    commandAccountLabel.hidden = createPost || postCommand;
    if (accountDatalist instanceof HTMLDataListElement) {
      accountDatalist.hidden = createPost || postCommand;
    }

    if (createPost || postCommand) {
      let postSelect;
      let titleInput;
      let categorySelect;
      let bodyInput;

      if (postCommand) {
        const posts = refreshAdminPosts();
        const postLabel = document.createElement("label");
        postLabel.htmlFor = "command-post-id";
        postLabel.textContent = "Community post";
        postSelect = document.createElement("select");
        postSelect.id = "command-post-id";
        postSelect.name = "postId";
        postSelect.required = true;
        if (posts) {
          posts.forEach((post) => {
            const option = document.createElement("option");
            option.value = post.id;
            option.textContent = `${post.title} · ${post.category} · ${post.id.slice(0, 8)}`;
            postSelect.append(option);
          });
        }
        if (!posts || posts.length === 0) {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = posts ? "No community posts available" : "Community posts could not be loaded";
          option.disabled = true;
          option.selected = true;
          postSelect.append(option);
          postSelect.disabled = true;
          commandSubmit.disabled = true;
          if (posts) {
            showCommandMessage("Create a post before using this command.");
          }
        }
        commandExtraField.append(postLabel, postSelect);

        if (command === "delete-post") {
          const confirmationLabel = document.createElement("label");
          confirmationLabel.htmlFor = "command-confirmation";
          confirmationLabel.textContent = "Type DELETE to confirm";
          const confirmationInput = document.createElement("input");
          confirmationInput.id = "command-confirmation";
          confirmationInput.name = "confirmation";
          confirmationInput.type = "text";
          confirmationInput.autocomplete = "off";
          confirmationInput.required = true;
          confirmationInput.pattern = "DELETE";
          confirmationInput.title = "Enter DELETE exactly to confirm.";
          commandExtraField.append(confirmationLabel, confirmationInput);
        }
      }

      if (createPost || command === "edit-post") {
        const titleLabel = document.createElement("label");
        titleLabel.htmlFor = "post-title-input";
        titleLabel.textContent = "Post title";
        titleInput = document.createElement("input");
        titleInput.id = "post-title-input";
        titleInput.name = "postTitle";
        titleInput.type = "text";
        titleInput.maxLength = 100;
        titleInput.autocomplete = "off";
        titleInput.required = true;
        titleInput.placeholder = "Give your post a title";

        const categoryLabel = document.createElement("label");
        categoryLabel.htmlFor = "post-category-input";
        categoryLabel.textContent = "Category";
        categorySelect = document.createElement("select");
        categorySelect.id = "post-category-input";
        categorySelect.name = "postCategory";
        categorySelect.required = true;
        [
          ["update", "Update"],
          ["announcement", "Announcement"],
        ].forEach(([value, text]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = text;
          categorySelect.append(option);
        });

        const bodyLabel = document.createElement("label");
        bodyLabel.htmlFor = "post-body-input";
        bodyLabel.textContent = "Post content";
        bodyInput = document.createElement("textarea");
        bodyInput.id = "post-body-input";
        bodyInput.name = "postBody";
        bodyInput.maxLength = 2000;
        bodyInput.rows = 6;
        bodyInput.required = true;
        bodyInput.placeholder = "Write the post message";
        commandExtraField.append(titleLabel, titleInput, categoryLabel, categorySelect, bodyLabel, bodyInput);
      }

      if (command === "edit-post" && postSelect instanceof HTMLSelectElement) {
        const updatePostFields = () => {
          const posts = refreshAdminPosts();
          const post = posts?.find((savedPost) => savedPost.id === postSelect.value);
          if (
            post &&
            titleInput instanceof HTMLInputElement &&
            categorySelect instanceof HTMLSelectElement &&
            bodyInput instanceof HTMLTextAreaElement
          ) {
            titleInput.value = post.title;
            categorySelect.value = post.category;
            bodyInput.value = post.body;
          }
        };
        postSelect.addEventListener("change", updatePostFields);
        updatePostFields();
      }
    } else if (command !== "delete-account") {
      const label = document.createElement("label");
      label.htmlFor = "command-action";
      label.textContent = "Action";
      const select = document.createElement("select");
      select.id = "command-action";
      select.name = "action";
      const actions = command === "account-status"
        ? [
            ["disable", "Disable account"],
            ["enable", "Enable account"],
          ]
        : [
            ["grant", "Grant moderator"],
            ["revoke", "Revoke moderator"],
          ];
      actions.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.append(option);
      });
      commandExtraField.append(label, select);
    } else {
      const label = document.createElement("label");
      label.htmlFor = "command-confirmation";
      label.textContent = 'Type DELETE to confirm';
      const input = document.createElement("input");
      input.id = "command-confirmation";
      input.name = "confirmation";
      input.type = "text";
      input.autocomplete = "off";
      input.required = true;
      input.pattern = "DELETE";
      input.title = 'Enter DELETE exactly to confirm.';
      commandExtraField.append(label, input);
    }

    if (!postCommand) {
      refreshAdminAccounts();
    }
    commandDialog.showModal();
    const firstInput = commandExtraField.querySelector("input, select, textarea");
    if (firstInput instanceof HTMLElement && !firstInput.hasAttribute("disabled")) {
      firstInput.focus();
    } else if (!commandAccountInput.hidden) {
      commandAccountInput.focus();
    }
  };

  refreshAdminAccounts();

  document.querySelectorAll(".admin-command").forEach((button) => {
    button.addEventListener("click", () => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }
      openCommandDialog(button.dataset.command ?? "");
    });
  });

  const refreshButton = document.querySelector("#refresh-accounts");
  if (refreshButton instanceof HTMLButtonElement) {
    refreshButton.addEventListener("click", refreshAdminAccounts);
  }

  const cancelButton = document.querySelector("#command-cancel");
  if (cancelButton instanceof HTMLButtonElement && commandDialog instanceof HTMLDialogElement) {
    cancelButton.addEventListener("click", () => commandDialog.close());
    commandDialog.addEventListener("click", (event) => {
      if (event.target === commandDialog) {
        commandDialog.close();
      }
    });
  }

  if (commandForm instanceof HTMLFormElement) {
    commandForm.addEventListener("submit", (event) => {
      event.preventDefault();

      try {
        const admin = getCurrentAdmin();
        if (!admin || admin.disabled === true) {
          window.location.replace("login.html");
          return;
        }

        const formData = new FormData(commandForm);
        if (activeCommand === "create-post") {
          const title = String(formData.get("postTitle") ?? "").trim();
          const category = String(formData.get("postCategory") ?? "");
          const body = String(formData.get("postBody") ?? "").trim();
          if (!title || !body || !POST_CATEGORIES.includes(category)) {
            showCommandMessage("Enter a title, post content, and a valid category.");
            return;
          }

          const posts = readCommunityPosts();
          posts.unshift({
            id: crypto.randomUUID(),
            title,
            category,
            body,
            createdAt: new Date().toISOString(),
            likes: 0,
            authorUsername: admin.username,
            authorAvatarId: admin.avatarId ?? "gamer",
          });
          localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, JSON.stringify(posts));
          showCommandMessage(`“${title}” was published to the Community page.`, true);
          commandForm.reset();
          return;
        }

        if (activeCommand === "delete-post" || activeCommand === "edit-post") {
          const postId = String(formData.get("postId") ?? "");
          const posts = readCommunityPosts();
          const post = posts.find((savedPost) => savedPost.id === postId);
          if (!post) {
            showCommandMessage("That community post no longer exists. Reopen the command and try again.");
            return;
          }

          if (activeCommand === "delete-post") {
            if (formData.get("confirmation") !== "DELETE") {
              showCommandMessage("Type DELETE exactly to confirm post removal.");
              return;
            }
            const likedPostIds = readLikedPostIds().filter((likedId) => likedId !== postId);
            localStorage.setItem(
              COMMUNITY_POSTS_STORAGE_KEY,
              JSON.stringify(posts.filter((savedPost) => savedPost.id !== postId)),
            );
            localStorage.setItem(POST_LIKES_STORAGE_KEY, JSON.stringify(likedPostIds));
            showCommandMessage(`“${post.title}” was deleted from the Community page.`, true);
            commandForm.reset();
            return;
          }

          const title = String(formData.get("postTitle") ?? "").trim();
          const category = String(formData.get("postCategory") ?? "");
          const body = String(formData.get("postBody") ?? "").trim();
          if (!title || !body || !POST_CATEGORIES.includes(category)) {
            showCommandMessage("Enter a title, post content, and a valid category.");
            return;
          }
          post.title = title;
          post.category = category;
          post.body = body;
          localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, JSON.stringify(posts));
          showCommandMessage(`“${title}” was updated on the Community page.`, true);
          commandForm.reset();
          return;
        }

        const targetId = String(formData.get("accountId") ?? "").trim().toUpperCase();
        const accounts = readLocalAccounts();
        const target = accounts.find((account) => account.id === targetId);
        if (!target) {
          showCommandMessage("No account with that ID exists in this browser.");
          return;
        }

        if (activeCommand === "delete-account") {
          if (formData.get("confirmation") !== "DELETE") {
            showCommandMessage("Type DELETE exactly to confirm account removal.");
            return;
          }
          const remainingAccounts = accounts.filter((account) => account.id !== targetId);
          localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(remainingAccounts));
          if (target.username === localStorage.getItem(SESSION_STORAGE_KEY)) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
          refreshAdminAccounts();
          showCommandMessage(`${target.id} (${target.username}) was deleted from this browser.`, true);
          commandForm.reset();
          return;
        }

        const action = String(formData.get("action") ?? "");
        if (activeCommand === "account-status" && (action === "enable" || action === "disable")) {
          target.disabled = action === "disable";
          localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
          refreshAdminAccounts();
          showCommandMessage(
            `${target.id} (${target.username}) is now ${target.disabled ? "disabled" : "enabled"}.`,
            true,
          );
          commandForm.reset();
          return;
        }

        if (activeCommand === "moderator-role" && (action === "grant" || action === "revoke")) {
          if (target.id === "SG-1" && action === "revoke") {
            showCommandMessage("The SG-1 administrator role cannot be revoked.");
            return;
          }
          target.moderator = action === "grant";
          localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
          refreshAdminAccounts();
          showCommandMessage(
            `Moderator status ${action === "grant" ? "granted to" : "revoked from"} ${target.id} (${target.username}).`,
            true,
          );
          commandForm.reset();
          return;
        }

        showCommandMessage("Choose a valid website moderation command.");
      } catch (error) {
        console.error("Could not execute the website moderation command.", error);
        showCommandMessage(
          error instanceof Error
            ? error.message
            : "Could not execute the command. Check browser storage and try again.",
        );
      }
    });
  }
}

const showFormMessage = (form, message, success = false) => {
  const messageElement = form.querySelector(".auth-message");
  if (messageElement instanceof HTMLElement) {
    messageElement.textContent = message;
    messageElement.classList.toggle("is-success", success);
  }
};

const registerForm = document.querySelector("#register-form");

if (registerForm instanceof HTMLFormElement) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const pin = String(formData.get("pin") ?? "");

    if (password !== confirmPassword) {
      showFormMessage(registerForm, "Passwords do not match.");
      registerForm.elements.namedItem("confirmPassword")?.focus();
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      showFormMessage(registerForm, "PIN Code must be exactly 4 digits.");
      registerForm.elements.namedItem("pin")?.focus();
      return;
    }

    try {
      const accounts = readLocalAccounts();
      const duplicate = accounts.some(
        (account) =>
          account.username.toLocaleLowerCase() === username.toLocaleLowerCase() ||
          account.email.toLocaleLowerCase() === email,
      );
      if (duplicate) {
        showFormMessage(registerForm, "That username or email already has a profile in this browser.");
        return;
      }

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const credentialHash = await createCredentialHash(password, pin, salt);
      const nextId = BigInt(localStorage.getItem(LAST_ACCOUNT_ID_KEY) ?? "0") + 1n;
      localStorage.setItem(LAST_ACCOUNT_ID_KEY, String(nextId));
      accounts.push({
        id: `SG-${nextId}`,
        username,
        email,
        salt: encodeBytes(salt),
        credentialHash,
        disabled: false,
        moderator: false,
        avatarId: "gamer",
      });
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
      localStorage.setItem(SESSION_STORAGE_KEY, username);
      window.location.assign("index.html");
    } catch (error) {
      showFormMessage(
        registerForm,
        error instanceof Error
          ? error.message
          : "Could not create the profile. Check browser storage and try again.",
      );
    }
  });
}

const loginForm = document.querySelector("#login-form");

if (loginForm instanceof HTMLFormElement) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const identifier = String(formData.get("identifier") ?? "").trim().toLocaleLowerCase();
    const password = String(formData.get("password") ?? "");
    const pin = String(formData.get("pin") ?? "");

    if (!/^\d{4}$/.test(pin)) {
      showFormMessage(loginForm, "PIN Code must be exactly 4 digits.");
      loginForm.elements.namedItem("pin")?.focus();
      return;
    }

    try {
      const accounts = readLocalAccounts();
      const account = accounts.find(
        (savedAccount) =>
          savedAccount.username.toLocaleLowerCase() === identifier ||
          savedAccount.email.toLocaleLowerCase() === identifier,
      );
      if (!account) {
        showFormMessage(loginForm, "Username/e-mail, password, or PIN is incorrect.");
        return;
      }
      if (account.disabled === true) {
        showFormMessage(loginForm, "This account is disabled. Contact an administrator.");
        return;
      }

      const salt = Uint8Array.from(atob(account.salt), (character) => character.charCodeAt(0));
      const credentialHash = await createCredentialHash(password, pin, salt);
      if (credentialHash !== account.credentialHash) {
        showFormMessage(loginForm, "Username/e-mail, password, or PIN is incorrect.");
        return;
      }

      localStorage.setItem(SESSION_STORAGE_KEY, account.username);
      window.location.assign("index.html");
    } catch (error) {
      showFormMessage(
        loginForm,
        error instanceof Error
          ? error.message
          : "Could not log in. Check browser storage and try again.",
      );
    }
  });
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const likeButton = event.target.closest(".post-like");
  if (!(likeButton instanceof HTMLButtonElement)) {
    return;
  }

  const isLiked = likeButton.getAttribute("aria-pressed") === "true";
  const count = likeButton.querySelector(".like-count");
  const label = likeButton.querySelector(".like-label");
  const currentCount = Number.parseInt(count?.textContent ?? "0", 10);
  const nextCount = Math.max(0, currentCount + (isLiked ? -1 : 1));
  const postCard = likeButton.closest(".post-card");
  const postId = postCard instanceof HTMLElement ? postCard.dataset.postId : undefined;

  try {
    if (postId) {
      const posts = readCommunityPosts();
      const post = posts.find((savedPost) => savedPost.id === postId);
      if (!post) {
        return;
      }
      const likedIds = readLikedPostIds().filter((id) => id !== postId);
      if (!isLiked) {
        likedIds.push(postId);
      }
      post.likes = nextCount;
      localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, JSON.stringify(posts));
      localStorage.setItem(POST_LIKES_STORAGE_KEY, JSON.stringify(likedIds));
    }

    likeButton.setAttribute("aria-pressed", String(!isLiked));
    likeButton.setAttribute("aria-label", isLiked ? "Like this post" : "Unlike this post");
    if (count instanceof HTMLElement) {
      count.textContent = String(nextCount);
    }
    if (label instanceof HTMLElement) {
      label.textContent = isLiked ? "Like" : "Liked";
    }
  } catch (error) {
    console.error("Could not save the post like.", error);
  }
});