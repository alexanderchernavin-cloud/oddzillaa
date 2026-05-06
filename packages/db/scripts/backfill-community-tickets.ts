// Backfills CommunityTicket rows for any settled Ticket that does not
// already have a projection. Idempotent — safe to run repeatedly.
//
// Run: pnpm -F @oddzilla/db backfill:community

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['won', 'lost', 'void'] },
      settledAt: { not: null },
      communityTicket: null,
    },
    include: {
      selections: {
        include: {
          outcome: {
            include: {
              market: {
                include: {
                  match: {
                    include: {
                      tournament: { include: { category: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`Found ${tickets.length} settled tickets needing projection`);

  let written = 0;
  for (const ticket of tickets) {
    const stake = Number(ticket.stakeUsdt);
    const odds = Number(ticket.totalOdds);
    const payout =
      ticket.status === 'won'
        ? Number((stake * odds).toFixed(2))
        : ticket.status === 'void'
          ? stake
          : 0;

    const sportIds = Array.from(
      new Set(
        ticket.selections.map(
          (s) => s.outcome.market.match.tournament.category.sportId,
        ),
      ),
    );

    await prisma.communityTicket.create({
      data: {
        ticketId: ticket.id,
        userId: ticket.userId,
        stakeUsdt: ticket.stakeUsdt,
        payoutUsdt: payout,
        totalOdds: ticket.totalOdds,
        numLegs: ticket.selections.length,
        status: ticket.status,
        sportIds,
        settledAt: ticket.settledAt!,
      },
    });
    written++;
  }

  console.log(`Wrote ${written} CommunityTicket projections`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
