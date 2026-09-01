import { PrismaClient } from "@prisma/client";
import { planDirections } from "@/lib/providers/direction-planner";
import { getPrimarySearchProvider } from "@/lib/providers/provider-factory";
import { selectRepresentativeSet } from "./select-set";

const prisma = new PrismaClient();

export async function runExplore(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { references: true } });
  if (!project) throw new Error("Project not found");

  await prisma.project.update({ where: { id: projectId }, data: { stage: "explore" } });

  const plans = await planDirections({
    request: project.originalRequest,
    references: project.references.map((r) => ({ imageUrl: r.imageUrl, comment: r.userComment ?? undefined }))
  });

  const provider = getPrimarySearchProvider();

  for (const plan of plans) {
    const direction = await prisma.direction.upsert({
      where: { projectId_order: { projectId, order: plan.order } },
      update: { title: plan.title, shortDescription: plan.description, querySetJson: JSON.stringify(plan.searchQueries), status: "searching" },
      create: { projectId, order: plan.order, title: plan.title, shortDescription: plan.description, querySetJson: JSON.stringify(plan.searchQueries), status: "searching" }
    });

    try {
      const pools = await Promise.all(plan.searchQueries.slice(0, 3).map((q) => provider.search(q, 10)));
      const deduped = Array.from(new Map(pools.flat().map((img) => [`${img.provider}:${img.providerId}`, img])).values());
      const selected = await selectRepresentativeSet(deduped, plan);

      await prisma.searchImage.deleteMany({ where: { directionId: direction.id } });
      await prisma.searchImage.createMany({
        data: selected.map((img, index) => ({
          directionId: direction.id,
          provider: img.provider,
          providerId: img.providerId,
          sourceUrl: img.sourceUrl,
          thumbnailUrl: img.thumbnailUrl,
          imageUrl: img.imageUrl,
          photographer: img.photographer,
          rank: index + 1,
          selected: true
        }))
      });
      await prisma.direction.update({ where: { id: direction.id }, data: { status: "ready" } });
    } catch (error) {
      console.error(`SCOUT direction ${plan.order} failed`, error);
      await prisma.direction.update({ where: { id: direction.id }, data: { status: "failed" } });
    }
  }

  return prisma.project.findUnique({
    where: { id: projectId },
    include: { directions: { orderBy: { order: "asc" }, include: { images: { orderBy: { rank: "asc" } } } } }
  });
}
