import { Document } from './document';

class Internal {
  email: string;
  phone: string;

  constructor(obj?: any) {
    this.email = (obj && obj.email) || null;
    this.phone = (obj && obj.phone) || null;
  }

  hasData(): boolean {
    return !!this.email || !!this.phone;
  }
}

class CommentAuthor {
  _userId: string; // object id -> User
  orgName: string;
  contactName: string;
  location: string;
  internal: Internal;

  constructor(obj?: any) {
    this._userId = (obj && obj._userId) || null;
    this.orgName = (obj && obj.orgName) || null;
    this.contactName = (obj && obj.contactName) || null;
    this.location = (obj && obj.location) || null;

    this.internal = new Internal((obj && obj.internal) || null); // must exist (expected by API)
  }

  hasData(): boolean {
    // not including refs
    return !!this.orgName || !!this.contactName || !!this.location || (this.internal && this.internal.hasData());
  }
}

export class Comment {
  _id: string;
  _addedBy: string; // object id -> User
  _commentPeriod: string; // object id -> CommentPeriod
  comment: string = null;
  commentAuthor: CommentAuthor;
  dateAdded: Date = null;

  // associated data
  documents: Document[] = [];

  constructor(obj?: any) {
    this._id = (obj && obj._id) || null;
    this._addedBy = (obj && obj._addedBy) || null;
    this._commentPeriod = (obj && obj._commentPeriod) || null;

    if (obj && obj.dateAdded) {
      this.dateAdded = new Date(obj.dateAdded);
    }

    this.commentAuthor = new CommentAuthor((obj && obj.commentAuthor) || null); // must exist

    // replace \\n (JSON format) with newlines
    if (obj && obj.comment) {
      this.comment = obj.comment.replace(/\\n/g, '\n');
    }

    // copy documents
    if (obj && obj.documents) {
      for (const doc of obj.documents) {
        this.documents.push(doc);
      }
    }
  }

  hasData(): boolean {
    // not including refs
    return !!this.comment || !!this.dateAdded || (this.commentAuthor && this.commentAuthor.hasData());
  }
}
