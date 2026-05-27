export interface Messages {
  nav: {
    home: string;
    latestStories: string;
    authors: string;
    about: string;
    login: string;
    logout: string;
    authorSpace: string;
    signedInAs: string;
    language: string;
  };
  localeNames: {
    es: string;
    ca: string;
    en: string;
  };
  home: {
    eyebrow: string;
    title: string;
    subtitle: string;
    status: string;
    latestTitle: string;
    empty: string;
    featuredBadge: string;
  };
  stories: {
    eyebrow: string;
    latestTitle: string;
    empty: string;
    author: string;
    aboutAuthor: string;
    publishedAt: string;
    updatedAt: string;
    excerptFallback: string;
    authorBioFallback: string;
    notFound: string;
  };
  authorsPage: {
    title: string;
    placeholder: string;
  };
  aboutPage: {
    title: string;
    description: string;
  };
  auth: {
    privateArea: string;
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    errorMissing: string;
    errorInvalid: string;
    statusLoggedOut: string;
  };
  authorDashboard: {
    eyebrow: string;
    welcome: string;
    description: string;
    manageStories: string;
    newStory: string;
    role: string;
    email: string;
    language: string;
    noAuthorProfile: string;
  };
  adminUsers: {
    title: string;
    description: string;
    email: string;
    displayName: string;
    slug: string;
    slugHint: string;
    locale: string;
    temporaryPassword: string;
    submit: string;
    success: string;
    successPendingEmail: string;
    manualEmailTitle: string;
    manualEmailDescription: string;
    manualEmailTo: string;
    manualEmailSubject: string;
    manualEmailBody: string;
    errorForbidden: string;
    errorInvalid: string;
    errorEmailTaken: string;
    errorGeneric: string;
  };
  authorStories: {
    eyebrow: string;
    title: string;
    newStory: string;
    operationDone: string;
    operationFailed: string;
    empty: string;
    lastEdit: string;
    publicationDate: string;
    edit: string;
    viewDraft: string;
    viewPublished: string;
    delete: string;
    statusDraft: string;
    statusPublished: string;
  };
  editor: {
    newTitle: string;
    editTitle: string;
    backToStories: string;
    saveStory: string;
    saveChanges: string;
    fieldTitle: string;
    fieldSubtitle: string;
    fieldSlugOptional: string;
    slugPlaceholder: string;
    fieldTags: string;
    tagsPlaceholder: string;
    fieldPublishedAt: string;
    fieldCover: string;
    coverCta: string;
    coverEmpty: string;
    commentsEnabled: string;
    status: string;
    statusDraft: string;
    statusPublished: string;
    toolbarBold: string;
    toolbarItalic: string;
    toolbarList: string;
    toolbarHeading: string;
    toolbarParagraph: string;
  };
  draft: {
    titlePrefix: string;
    privateEyebrow: string;
    notFound: string;
    lastEdit: string;
  };
}
