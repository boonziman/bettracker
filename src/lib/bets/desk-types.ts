import type { Ticket } from "./types";

export type DeskUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  ticketCount: number;
  stake: number;
};

export type DeskTicket = {
  userId: string;
  username: string;
  ticket: Ticket;
};

export type BugRow = {
  id: string;
  userId: string;
  username: string;
  title: string;
  body: string;
  path: string | null;
  createdAt: string;
};
