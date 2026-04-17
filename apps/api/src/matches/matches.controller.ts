import { Controller, Get, Param, Query } from '@nestjs/common';
import { MatchesService } from './matches.service';

@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get('sports')
  getSports() {
    return this.matches.getSports();
  }

  @Get('matches')
  getMatches(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matches.getMatches({
      status: (status as 'live' | 'scheduled' | 'finished') ?? undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('matches/:id')
  getMatch(@Param('id') id: string) {
    return this.matches.getMatch(id);
  }
}
