"use client";

import { Fragment } from "react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export function PagePagination({ page, totalCount, pageSize, onPageChange }: { page: number; totalCount: number; pageSize: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((value) => value === 1 || value === totalPages || Math.abs(value - page) <= 1);
  return <Pagination><PaginationContent>
    <PaginationItem><PaginationPrevious href="#" text="Anterior" aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); if (page > 1) onPageChange(page - 1); }} /></PaginationItem>
    {pages.map((value, index) => <Fragment key={value}>
      {index > 0 && value - pages[index - 1] > 1 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
      <PaginationItem><PaginationLink href="#" isActive={value === page} onClick={(event) => { event.preventDefault(); onPageChange(value); }}>{value}</PaginationLink></PaginationItem>
    </Fragment>)}
    <PaginationItem><PaginationNext href="#" text="Próxima" aria-disabled={page === totalPages} className={page === totalPages ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { event.preventDefault(); if (page < totalPages) onPageChange(page + 1); }} /></PaginationItem>
  </PaginationContent></Pagination>;
}
