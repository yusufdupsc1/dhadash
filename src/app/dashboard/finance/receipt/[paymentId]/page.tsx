import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ paymentId: string }>;
}

export default async function ReceiptPrintPage({ params }: PageProps) {
  const { paymentId } = await params;
  const session = await auth();
  const currentUser = session?.user as
    | { id?: string; institutionId?: string }
    | undefined;
  const institutionId = currentUser?.institutionId;

  if (!institutionId) {
    redirect("/auth/login/admin");
  }

  const payment = await db.payment.findFirst({
    where: { id: paymentId, institutionId },
    include: {
      fee: {
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
          class: {
            select: {
              name: true,
              section: true,
            },
          },
        },
      },
      institution: {
        select: {
          name: true,
          address: true,
          phone: true,
        },
      },
    },
  });

  if (!payment) {
    return (
      <main className="print-a4 p-4">
        <p>Receipt not found.</p>
      </main>
    );
  }

  if (currentUser?.id) {
    try {
      await db.auditLog.create({
        data: {
          action: "PRINT_FEE_RECEIPT",
          entity: "Payment",
          entityId: payment.id,
          newValues: {
            receiptNumber: payment.receiptNumber,
            paymentId: payment.id,
          },
          userId: currentUser.id,
        },
      });
    } catch (error) {
      console.error("[FEE_RECEIPT_PRINT_AUDIT]", error);
    }
  }

  return (
    <main className="print-a4 text-slate-900">
      <header className="mb-4 border-b border-slate-300 pb-3 text-center">
        <h1 className="text-xl font-bold">ফি রশিদ</h1>
        <p className="text-xs text-slate-600">Fee Receipt</p>
        <p className="mt-2 text-sm font-semibold">{payment.institution.name}</p>
        <p className="text-xs text-slate-600">
          {payment.institution.address ?? "Bangladesh"}
        </p>
        {payment.institution.phone ? (
          <p className="text-xs text-slate-600">{payment.institution.phone}</p>
        ) : null}
      </header>

      <section className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="font-semibold">রশিদ নং:</span>{" "}
          {payment.receiptNumber ?? "N/A"}
        </p>
        <p>
          <span className="font-semibold">Receipt No:</span>{" "}
          {payment.receiptNumber ?? "N/A"}
        </p>
        <p>
          <span className="font-semibold">তারিখ:</span>{" "}
          {formatDate(payment.paidAt)}
        </p>
        <p>
          <span className="font-semibold">পেমেন্ট পদ্ধতি:</span>{" "}
          {payment.method}
        </p>
      </section>

      <section className="mb-5 rounded border border-slate-300 p-3 text-sm">
        <h2 className="mb-2 font-semibold">শিক্ষার্থীর তথ্য (Student)</h2>
        <p>
          {payment.fee.student.firstName} {payment.fee.student.lastName} (
          {payment.fee.student.studentId})
        </p>
        <p>
          {payment.fee.class?.name ?? "-"} / {payment.fee.class?.section ?? "-"}
        </p>
      </section>

      <table className="receipt-print-table w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left">SL</th>
            <th className="text-left">বিবরণ / Description</th>
            <th className="text-right">পরিমাণ / Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>{payment.fee.title}</td>
            <td className="text-right">
              {formatCurrency(Number(payment.amount))}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="text-right font-semibold">
              মোট / Total
            </td>
            <td className="text-right font-semibold">
              {formatCurrency(Number(payment.amount))}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 text-right">
        <p className="text-sm">মোট পরিশোধ / Total Paid</p>
        <p className="text-lg font-bold">
          {formatCurrency(Number(payment.amount))}
        </p>
      </div>

      <footer className="mt-12 text-sm">
        <div className="receipt-signature grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="text-left">
            <p className="signature-line">
              ....................................
            </p>
            <p className="font-semibold">প্রস্তুতকারী</p>
            <p className="text-xs text-slate-600">Prepared By</p>
          </div>
          <div className="text-right">
            <p className="signature-line">
              ....................................
            </p>
            <p className="font-semibold">স্বাক্ষর</p>
            <p className="text-xs text-slate-600">Authorized Signature</p>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-slate-600">এই রশিদটি কম্পিউটার-জেনারেটেড।</p>
          <p className="text-slate-600">This receipt is system generated.</p>
        </div>
      </footer>
    </main>
  );
}
